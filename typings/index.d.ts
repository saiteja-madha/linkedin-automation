export type WorkLocation = "ON_SITE" | "REMOTE" | "HYBRID";

export type JobType = "FULL_TIME" | "PART_TIME" | "CONTRACT" | "TEMPORARY" | "OTHER";

type ExperienceLevel =
    | "INTERNSHIP"
    | "ENTRY_LEVEL"
    | "ASSOCIATE"
    | "MID_SENIOR"
    | "DIRECTOR"
    | "EXECUTIVE";

export type JobFilter = {
    title: string;
    location: string;
    easyApply?: boolean;
    workLocation?: WorkLocation;
    jobType?: JobType;
    experienceLevel?: ExperienceLevel;
};

export type JobDetails = {
    jobId: string;
    title: string;
    company: string;
    location: string;
    workType: string;
    applicants: string;
    posted: string;
};

export type ApplicationStatus = "SUCCESS" | "FAILED";

export type QuestionType = "TEXT" | "RADIO" | "DROPDOWN";
