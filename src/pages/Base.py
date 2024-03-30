from selenium import webdriver
from selenium.webdriver.remote.webelement import WebElement
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import time


class BasePage:
    base_url = "https://www.linkedin.com"

    def __init__(self, driver: webdriver.Chrome):
        self.driver = driver

    def wait(self, seconds):
        time.sleep(seconds)

    def find_element(self, el=None, by=By.CSS_SELECTOR, value=None, fail=True):
        func = self.driver.find_element if el is None else el.find_element
        try:
            return func(by, value)
        except Exception as e:
            if fail:
                raise e
            return None

    def find_elements(self, el=None, by=By.CSS_SELECTOR, value=None, fail=True):
        func = self.driver.find_elements if el is None else el.find_elements
        try:
            return func(by, value)
        except Exception as e:
            if fail:
                raise e
            return []

    def wait_for_selector(self, by: By, value: str, timeout=10, fail=True):
        try:
            element = WebDriverWait(self.driver, timeout).until(EC.presence_of_element_located((by, value)))
            return element
        except Exception as e:
            if fail:
                raise e
            return None

    def wait_and_type(self, by: By, value: str, text: str) -> WebElement:
        element = self.wait_for_selector(by, value)
        element.send_keys(text)
        return element

    def wait_and_click(self, by: By, value: str) -> WebElement:
        element = self.wait_for_selector(by, value)
        element.click()
        return element
