class BasePage {
    baseUrl = "https://www.linkedin.com";

    /**
     * @param {import('puppeteer').Browser} browser
     * @param {import('puppeteer').Page} page
     */
    constructor(browser, page) {
        this.browser = browser;
        this.page = page;
    }

    async wait(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async findTargetAndType(target, value) {
        if (!this.page) return;
        await this.page.waitForSelector(target);
        const el = await this.page.$(target).catch((ex) => {});
        if (el) {
            await el.type(value, {
                delay: 10,
            });
        }
    }

    async targetClick(selector) {
        if (!this.page) return;
        await this.page.waitForSelector(selector);
        const buttonClick = await this.page.$(selector).catch((ex) => {});
        if (buttonClick) {
            await buttonClick.click();
        }
    }
}

export default BasePage;
