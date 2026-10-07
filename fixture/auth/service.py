class UserDatabase:
    def __init__(self):
        # Registration normalizes emails to lowercase
        self.users = {
            "joshua@gmail.com": {"password": "hashed_pass"}
        }

    def reset_password(self, email: str, new_password: str):
        email = email.lower()
        if email in self.users:
            self.users[email]["password"] = new_password
            return True
        return False

db = UserDatabase()
