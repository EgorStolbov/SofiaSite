import sqlite3
from models import User

class Database:
    def __init__(self, database_path="database.db"):
        self.conn = sqlite3.connect(database_path)
        self.cursor = self.conn.cursor()
        self.create_tables()

    def add_user(self, login: str, password: str):
        sql = """
        INSERT INTO users (login, password) VALUES (?, ?);
        """
        self.cursor.execute(sql, (login, password))
        self.conn.commit()

    def get_user(self, login: str, password: str) -> User:
        sql = """
        SELECT login FROM users WHERE login = ? AND password = ?;
        """
        user = self.cursor \
                    .execute(sql, (login, password)) \
                    .fetchone()
        if user:
            user = User(user[0])
            return user
        else:
            raise Exception("User not found")

    def delete_user(self, login: str, password: str):
        sql = """
        SELECT login FROM users WHERE login = ? AND password = ?;
        """
        user = self.cursor \
                    .execute(sql, (login, password)) \
                    .fetchone()
        if user:
            sql = """
            DELETE FROM users WHERE login = ?;
            """
            self.cursor.execute(sql, (login, ))
            self.conn.commit()
        else:
            raise Exception("Cannot delete user")

    def update_user(self, login: str, password: str, new_password: str):
        sql = """
        SELECT login FROM users WHERE login = ? AND password = ?;
        """
        user = self.cursor \
                    .execute(sql, (login, password)) \
                    .fetchone()
        if user:
            sql = """
            UPDATE users SET password = ? WHERE login = ?;
            """
            self.cursor.execute(sql, (new_password, login))
            self.conn.commit()
        else:
            raise Exception("Cannot update user")

    def create_tables(self):
        create_table_users = """
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, login TEXT NOT NULL UNIQUE, password TEXT NOT NULL);
        """
        self.cursor.execute(create_table_users)
        self.conn.commit()
