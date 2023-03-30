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
    args: ["--start-maximized", "--disable-notifications"],
    headless: false,
    timeout: 30000,
};
