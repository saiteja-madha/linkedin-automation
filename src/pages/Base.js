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
        const e = await this.page.$(target).catch((ex) => {});
        if (e)
            await e.type(value, {
                delay: 10,
            });
    }

    async buttonClick(selector) {
        await this.page.waitForSelector(selector);
        const buttonClick = await this.page.$(selector);
        await buttonClick.click();
    }
}

export default BasePage;
