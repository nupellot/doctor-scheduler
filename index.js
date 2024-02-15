// Подключение необходимых модулей
const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

// Инициализация Express приложения
const app = express();

// Настройка движка для представлений EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Настройка статических файлов
app.use(express.static(path.join(__dirname, "public")));

// Парсинг данных из тела запроса
app.use(express.urlencoded({extended: false}));

// Подключение к базе данных SQLite
const db_name = path.join(__dirname, "data", "database.db");
const db = new sqlite3.Database(db_name, err => {
    if (err) {
        return console.error(err.message);
    }
    console.log(`Подключено к базе данных`);
});


// Запуск сервера на порту 3000
app.listen(3000, () => {
    console.log("Сервер запущен: http://localhost:3000/");
});


// Обработка корневого маршрута
app.get("/", (req, res) => {
    // Перенаправление на маршрут "/shifts"
    res.redirect("/shifts");
});



// Обработка GET-запроса для страницы создания записи
app.get("/create", (req, res) => {
    // SQL-запрос для выборки данных о типах процедур из базы данных
    const sql = "SELECT * FROM procedure_types ORDER BY id";

    // Выполнение запроса
    db.all(sql, [], (err, procedure_types) => {
        if (err) {
            return console.error(err.message);
        }
        // Рендеринг страницы создания записи и передача данных в представление
        res.render("createShift", {model: {}, row: procedure_types});
    });
});


// Обработка POST-запроса для создания записи
app.post("/create", (req, res) => {
    // SQL-запросы для вставки данных
    const sql1 = "INSERT INTO shifts (procedures, date, difficulty) VALUES (?, ?, ?)";
    const sql2 = "INSERT INTO added_procedures_list (procedure_name, date, patient_name) VALUES (?, ?, ?)";

    // Получение данных из тела запроса
    let book = req.body.date;
    let procedures = String(req.body.procedures).split(',');
    let fio = req.body.fio;

    let difficulty = 0;
    let procedureList = '';

    // Обработка списка процедур и расчет сложности
    for (let i = 0; i < procedures.length; i++) {
        if (i % 2 === 1) {
            difficulty += Number(procedures[i]);
        } else {
            procedureList += procedures[i] + ',';
        }
    }

    // Проверка сложности процедуры
    if (difficulty > 10) {
        res.render("failed");  // Вывод страницы с сообщением о превышении сложности
    } else {
        // Вставка данных в базу данных
        db.all(sql1, procedureList, book, difficulty, err => {
            if (err) {
                return console.error(err.message);
            }
        });

        // Вставка данных во вторую таблицу
        for (let i = 0, j = 0; j < procedures.length; i++, j = j + 2) {
            db.all(sql2, procedures[j], book, fio[i], err => {
                if (err) {
                    return console.error(err.message);
                }
            });
        }

        // Перенаправление на маршрут "/shifts" после успешного создания записи
        res.redirect("/shifts");
    }

    console.log(difficulty);
});



// Обработка GET-запроса для страницы со списком смен
app.get("/shifts", (req, res) => {
    // SQL-запрос для выборки данных о сменах из базы данных
    const sql = "SELECT id, procedures, difficulty, strftime('%d.%m.%Y', date) as formatted_date FROM shifts ORDER BY date";

    // Выполнение запроса
    db.all(sql, [], (err, rows) => {
        if (err) {
            return console.error(err.message);
        }
        // Рендеринг страницы со списком смен и передача данных в представление
        res.render("shifts", {model: rows});
    });
});



// Обработка GET-запроса для страницы редактирования записи
app.get("/edit/:id", (req, res) => {
    // Извлечение параметра ID из запроса
    const id = req.params.id;

    // SQL-запрос для выборки данных о конкретной записи по ID
    const sql = "SELECT * FROM shifts WHERE id = ?";

    // Выполнение запроса
    db.get(sql, id, (err, row) => {
        if (err) {
            return console.error(err.message);
        }

        // SQL-запрос для выборки данных о типах процедур из базы данных
        const procedureTypesSQL = "SELECT * FROM procedure_types ORDER BY id";

        // Выполнение запроса
        db.all(procedureTypesSQL, [], (err, procedure_types) => {
            if (err) {
                return console.error(err.message);
            }

            // Рендеринг страницы редактирования записи и передача данных в представление
            res.render("editShift", { model: row, row: procedure_types });
        });
    });
});

// Обработка POST-запроса для обновления записи по ID
app.post("/edit/:id", (req, res) => {
    // Извлечение параметра ID из запроса
    const id = req.params.id;

    // SQL-запрос для обновления данных в записи по ID
    const updateSQL = "UPDATE shifts SET procedures = ?, date = ?, difficulty = ? WHERE id = ?";

    // Получение данных из тела запроса
    let book = req.body.date;
    let procedures = req.body.procedures.split(',');
    let difficulty = 0;

    // Расчет сложности процедур
    for (let i = 1; i < procedures.length; i += 2) {
        difficulty += Number(procedures[i]);
    }

    // Выполнение запроса на обновление записи
    db.run(updateSQL, procedures.join(','), book, difficulty, id, err => {
        if (err) {
            return console.error(err.message);
        }
        // Перенаправление на маршрут "/shifts" после успешного обновления записи
        res.redirect("/shifts");
    });
});




// Обработка POST-запроса для удаления записи по ID
app.post("/delete/:id", (req, res) => {
    // Извлечение параметров из запроса
    const id = req.params.id;
    const date = req.body.date;

    // SQL-запрос для удаления записи из двух таблиц
    const sql = "DELETE FROM shifts WHERE id = ?; DELETE FROM added_procedures_list WHERE date = ?";

    // Выполнение запроса
    db.run(sql, id, date, err => {
        if (err) {
            return console.error(err.message);
        }
        // Перенаправление на маршрут "/shifts" после успешного удаления записи
        res.redirect("/shifts");
    });
});
