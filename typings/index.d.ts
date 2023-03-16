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
