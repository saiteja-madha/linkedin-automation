from selenium import webdriver
from selenium.webdriver.common.by import By
from .Base import BasePage


class LoginPage(BasePage):
    path = "/login"

    def __init__(self, driver: webdriver.Chrome):
        super().__init__(driver)
        self.driver.get(self.base_url + self.path)
        self.wait(2)

    def login(self, username: str, password: str):
        if "LinkedIn" in self.driver.title:
            print("Already Logged In")
            return self

        self.wait_and_type(By.CSS_SELECTOR, "[name='session_key']", username)
        pwd_elem = self.wait_and_type(
            By.CSS_SELECTOR, "[name='session_password']", password
        )
        pwd_elem.submit()

        if "Verification" in self.driver.title:
            otp = input("Enter OTP: ")
            otp_elem = self.wait_and_type(By.CSS_SELECTOR, "[name='pin']", otp)
            otp_elem.submit()
            self.wait(5)

        assert "LinkedIn" in self.driver.title, "Login Failed"
        return self
