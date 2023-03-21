import { Browser, Page } from "puppeteer";

class BasePage {
    baseUrl = "https://www.linkedin.com";
    browser: Browser;
    page: Page;

    constructor(browser: Browser, page: Page) {
        this.browser = browser;
        this.page = page;
    }

    async wait(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async findTargetAndType(target: string, value: string) {
        if (!this.page) return;
        await this.page.waitForSelector(target);
        const el = await this.page.$(target).catch(() => {});
        if (el) {
            await el.type(value, {
                delay: 10,
            });
        }
    }

    async targetClick(selector: string) {
        if (!this.page) return;
        await this.page.waitForSelector(selector);
        const el = await this.page.$(selector).catch(() => {});
        if (el) {
            await el.click();
        }
    }
}

export default BasePage;
