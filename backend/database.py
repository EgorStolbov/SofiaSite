import json
import os
import sqlite3
from datetime import datetime

from models import User
from security import hash_password, verify_password
from products_seed import PRODUCTS_SEED


class Database:
    def __init__(self, database_path=None):
        # Путь к БД можно переопределить окружением (например, для тома Docker).
        self.database_path = database_path or os.environ.get("DB_PATH", "database.db")
        self.conn = sqlite3.connect(self.database_path)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        self.create_tables()
        self.migrate_legacy_users()
        self.seed_products()

    # ---------- Таблицы и наполнение ----------

    def create_tables(self):
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                login TEXT NOT NULL UNIQUE,
                password TEXT,          -- старый plaintext (только для миграции)
                password_hash TEXT      -- PBKDF2: salt$digest
            );
            """
        )
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                price INTEGER NOT NULL,
                image TEXT NOT NULL,
                rating REAL NOT NULL,
                material TEXT NOT NULL,
                color TEXT NOT NULL,
                dimensions TEXT NOT NULL,
                description TEXT NOT NULL
            );
            """
        )
        self.cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                total INTEGER NOT NULL,
                items TEXT NOT NULL,      -- JSON: [{id, title, price, qty}]
                created_at TEXT NOT NULL
            );
            """
        )
        self.conn.commit()
        self._ensure_users_schema()

    def _ensure_users_schema(self):
        # Для уже существующих баз старой схемы: в users колонка password
        # объявлена NOT NULL, а мы пишем только password_hash.
        # Пересоздаём таблицу, сохраняя всех пользователей.
        info = self.cursor.execute("PRAGMA table_info(users);").fetchall()
        columns = {row[1] for row in info}
        password_cols = [row for row in info if row[1] == "password"]
        outdated = not password_cols or password_cols[0]["notnull"] == 1
        if not outdated:
            return
        select_password = "password" if "password" in columns else "NULL"
        select_hash = "password_hash" if "password_hash" in columns else "NULL"
        self.cursor.execute(
            """
            CREATE TABLE users_new (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                login TEXT NOT NULL UNIQUE,
                password TEXT,
                password_hash TEXT
            );
            """
        )
        self.cursor.execute(
            f"""
            INSERT INTO users_new (id, login, password, password_hash)
            SELECT id, login, {select_password}, {select_hash}
            FROM users;
            """
        )
        self.cursor.execute("DROP TABLE users;")
        self.cursor.execute("ALTER TABLE users_new RENAME TO users;")
        self.conn.commit()

    def migrate_legacy_users(self):
        # У пользователей из старой версии БД пароль лежит открытым текстом.
        # При первом запуске закрываем это хеш-версиями.
        rows = self.cursor.execute(
            "SELECT id, password, password_hash FROM users WHERE password IS NOT NULL"
        ).fetchall()
        for row in rows:
            if row["password"] and not row["password_hash"]:
                self.cursor.execute(
                    "UPDATE users SET password_hash = ? WHERE id = ?",
                    (hash_password(row["password"]), row["id"]),
                )
        self.conn.commit()

    def seed_products(self):
        count = self.cursor.execute("SELECT COUNT(*) FROM products").fetchone()[0]
        if count > 0:
            return
        for product in PRODUCTS_SEED:
            self.cursor.execute(
                """
                INSERT INTO products
                    (id, category, title, price, image, rating, material, color, dimensions, description)
                VALUES
                    (:id, :category, :title, :price, :image, :rating, :material, :color, :dimensions, :description);
                """,
                product,
            )
        self.conn.commit()

    # ---------- Пользователи ----------

    def add_user(self, login: str, password: str):
        try:
            self.cursor.execute(
                "INSERT INTO users (login, password_hash) VALUES (?, ?);",
                (login, hash_password(password)),
            )
            self.conn.commit()
        except sqlite3.IntegrityError as error:
            raise Exception("User already exists") from error

    def verify_user(self, login: str, password: str) -> tuple[User, int]:
        row = self.cursor.execute(
            "SELECT id, login, password, password_hash FROM users WHERE login = ?;",
            (login,),
        ).fetchone()
        if row is None:
            raise Exception("Wrong login or password")
        if not verify_password(password, row["password_hash"]):
            raise Exception("Wrong login or password")
        return User(row["login"]), row["id"]

    def user_id(self, login: str) -> int:
        row = self.cursor.execute(
            "SELECT id FROM users WHERE login = ?;", (login,)
        ).fetchone()
        if row is None:
            raise Exception("User not found")
        return row["id"]

    def delete_user(self, login: str, password: str):
        (user, user_id) = self.verify_user(login, password)
        self.cursor.execute("DELETE FROM orders WHERE user_id = ?;", (user_id,))
        self.cursor.execute("DELETE FROM users WHERE id = ?;", (user_id,))
        self.conn.commit()

    def update_user(self, login: str, password: str, new_password: str):
        self.verify_user(login, password)
        self.cursor.execute(
            "UPDATE users SET password_hash = ? WHERE login = ?;",
            (hash_password(new_password), login),
        )
        self.conn.commit()

    # ---------- Товары ----------

    def get_products(self, category: str | None = None) -> list[dict]:
        if category:
            rows = self.cursor.execute(
                "SELECT * FROM products WHERE category = ? ORDER BY rating DESC;",
                (category,),
            ).fetchall()
        else:
            rows = self.cursor.execute(
                "SELECT * FROM products ORDER BY rating DESC;"
            ).fetchall()
        return [dict(row) for row in rows]

    def get_product(self, product_id: int) -> dict:
        row = self.cursor.execute(
            "SELECT * FROM products WHERE id = ?;", (product_id,)
        ).fetchone()
        if row is None:
            raise Exception("Product not found")
        return dict(row)

    def find_products(self, items: list[dict]) -> list[dict]:
        """Проверяет наличие товаров и возвращает их данные по списку {id, qty}."""
        result = []
        for item in items:
            row = self.cursor.execute(
                "SELECT id, title, price FROM products WHERE id = ?;", (item["id"],)
            ).fetchone()
            if row is None:
                raise Exception(f"Product {item['id']} not found")
            position = dict(row)
            position["qty"] = item["qty"]
            result.append(position)
        return result

    # ---------- Заказы ----------

    def create_order(self, user_id: int, items: list[dict]) -> dict:
        positions = self.find_products(items)
        total = sum(position["price"] * position["qty"] for position in positions)
        created_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cursor = self.cursor.execute(
            "INSERT INTO orders (user_id, total, items, created_at) VALUES (?, ?, ?, ?);",
            (user_id, total, json.dumps(positions, ensure_ascii=False), created_at),
        )
        self.conn.commit()
        return {
            "id": cursor.lastrowid,
            "total": total,
            "items": positions,
            "created_at": created_at,
        }

    def get_orders(self, user_id: int) -> list[dict]:
        rows = self.cursor.execute(
            "SELECT id, total, items, created_at FROM orders WHERE user_id = ? ORDER BY id DESC;",
            (user_id,),
        ).fetchall()
        return [
            {
                "id": row["id"],
                "total": row["total"],
                "items": json.loads(row["items"]),
                "created_at": row["created_at"],
            }
            for row in rows
        ]
