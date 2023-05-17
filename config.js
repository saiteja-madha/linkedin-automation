export default {
    // LinkedIn Credentials
    email: "",
    password: "",

    // Mandatory Filters
    keyword: "Software Engineer Intern",
    location: "United States",

    // Optional Filters
    workLocation: "REMOTE", // ON_SITE, REMOTE, HYBRID
    jobType: "FULL_TIME", // PART_TIME, FULL_TIME, CONTRACT, TEMPORARY, OTHER
    experienceLevel: "", // INTERNSHIP, ENTRY_LEVEL, ASSOCIATE, MID_SENIOR, DIRECTOR, EXECUTIVE

    // Dev Options
    testMode: true, // don't submit the application, just log
    fillAttempts: 1, // number of times to try filling out the details
    args: ["--start-maximized", "--disable-notifications"],
    headless: false,
    timeout: 30000,

    answers: {
        // ------------ Personal info ---------------
        // [TextBox]
        first_name: "Sai Teja",
        last_name: "Madha",
        phone: "",
        website: "",
        linkedin: "https://www.linkedin.com/in/xxx-xxxx/",
        github: "https://github.com/xxx-xxxx",
        street_address: "000, Street",
        city: "City",
        state: "State",
        zip_code: "000000",

        // [Dropdown]
        country_code: "",
        email: "",

        // ------------ Experience Years [TextBox] ---------------
        // You can specify different skills for different years of experience
        // Format: <years>: [<skills>]
        experience_years: {
            1: ["Java"],
            2: ["Python", "Javascript"],
            3: ["Git"],
        },
        default_experience_years: 0,
    },
};
