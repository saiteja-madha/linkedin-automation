import { Browser, Page } from "puppeteer";
import BasePage from "./Base";
import config from "../../config.js";

class LoginPage extends BasePage {
    #path = "/login";

    constructor(browser: Browser, page: Page) {
        super(browser, page);
    }

    async open() {
        if (!this.page) {
            this.page = super.page = await this.browser.newPage();
        }
        await this.page.goto(this.baseUrl + this.#path);
        await this.wait(2000);
    }

    async login() {
        if (!this.page.url().includes("login")) return;
        await this.findTargetAndType('[name="session_key"]', config.email);
        await this.findTargetAndType('[name="session_password"]', config.password);
        await this.wait(1000);
        await this.page.keyboard.press("Enter");
        await this.wait(10000);
    }
}

export default LoginPage;
