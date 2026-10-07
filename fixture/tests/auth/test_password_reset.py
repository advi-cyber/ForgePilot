from auth.service import db


def test_password_reset_existing():
    assert db.reset_password("joshua@gmail.com", "new_pass") == True


def test_password_reset_nonexistent():
    assert db.reset_password("nobody@gmail.com", "new_pass") == False


def test_password_reset_case_insensitive_existing():
    assert db.reset_password("JOSHUA@gmail.com", "new_pass") == True


def test_password_reset_case_insensitive_nonexistent():
    assert db.reset_password("NOBODY@gmail.com", "new_pass") == False


def test_password_reset_preserves_other_state():
    assert db.reset_password("Joshua@GMAIL.com", "new_pass2") == True
    assert db.users["joshua@gmail.com"]["password"] == "new_pass2"


def test_password_reset_lowercases_email_before_lookup():
    assert db.reset_password("JoShUa@GmAiL.CoM", "new_pass3") == True
    assert "joshua@gmail.com" in db.users
