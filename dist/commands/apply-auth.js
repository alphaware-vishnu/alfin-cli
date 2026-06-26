"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyAuthCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const paths_js_1 = require("../utils/paths.js");
const registry_js_1 = require("../registry/registry.js");
const add_js_1 = require("./add.js");
// SIDEBAR SECTIONS DEFINITION
const SIDEBAR_SECTIONS = [
    { name: "Client Onboarding", key: "client-onboard", placeholder: "CLIENT_ONBOARD", modules: ["application-form"], routes: ["client-onboard-routes", "company-bank-routes", "partner-routes"] },
    { name: "User Management", key: "user-management", placeholder: "USER_MANAGEMENT", modules: ["user-master", "role-master", "maker-checker", "branch-master", "system-resource", "system-group", "system-permission", "system-role"], routes: ["users-routes", "branch-routes", "group-routes", "system-group-routes", "system-permission-routes", "system-resource-routes", "maker-checker-routes"] },
    { name: "Product Configuration", key: "product-configuration", placeholder: "PRODUCT_CONFIGURATION", modules: ["product-scheme", "charges"], routes: ["product-routes", "scheme-routes", "charge-routes"] },
    { name: "KYC Management", key: "kyc-management", placeholder: "KYC_MANAGEMENT", modules: ["documents-master", "scorecard", "threshold"], routes: ["document-category-routes", "document-type-routes", "score-card-routes", "threshold-routes"] },
    { name: "Loan Settings", key: "loan-settings", placeholder: "LOAN_SETTINGS", modules: ["tax-rates", "estamp", "enach", "allocation-strategy"], routes: ["tax-rate-routes", "estamp-routes", "enach-routes", "allocation-strategy-routes"] },
    { name: "Form Builder", key: "form-builder", placeholder: "FORM_BUILDER", modules: ["form-builder"], routes: [] },
    { name: "Email Notification", key: "email-notification", placeholder: "EMAIL_NOTIFICATION", modules: [], routes: ["email-editor-routes"] },
    { name: "Automation", key: "automation", placeholder: "AUTOMATION", modules: ["model-config", "questionary"], routes: ["model-configuration-routes", "questionary-routes"] },
    { name: "Appearance", key: "appearance", placeholder: "APPEARANCE", modules: ["appearance"], routes: ["appearance-routes"] }
];
const defaultEnumsContent = `export enum ResourceType {
    MODULE = "MODULE",
    MENU = "MENU",
    PAGE = "PAGE",
    ACTION = "ACTION",
}

export const RESOURCE_PERMISSIONS = {
    SYSTEM: {
        USERS: {
            CODE: "TA1ZXGT1O56Y",
            CREATE: "5U0HL57VTA0E",
            DELETE: "PKMUN1Y8F65B",
            UPDATE: "948LQ1CWSB0L",
            VIEW: "V83IMGW6L60Y",
            ENABLE_DISABLE: "ETO7Y5FKW1UB",
        },
        ROLES: {
            CODE: "IPKH59WYPTH4",
            CREATE: "4OO7QTWXT9BH",
            DELETE: "6SMLS20H1TOQ",
            UPDATE: "H0XPIWJ26BLA",
            VIEW: "N8YLKNE49DW5",
        },
        RESOURCE_MANAGEMENT: {
            CODE: "50M4ZIGATEEO",
            CREATE: "4RBVOAO2T852",
            DELETE: "G20W9HD2OK5C",
            UPDATE: "FJ2TA775NMNK",
            VIEW: "53GNAW8IW041",
        },
        ACTION_MANAGEMENT: {
            CODE: "8N052NQR8R02",
            CREATE: "UAW0U29SY36I",
            DELETE: "5CV68C5PLVTN",
            UPDATE: "X1MKV1RJP5FX",
            VIEW: "TPXL1OXOSA7E",
        },
        BRANCH: {
            CODE: "HQT35OHMF9XZ",
            CREATE: "L57TEIU4UTHG",
            DELETE: "51EVIFTEDU9Z",
            UPDATE: "T3KD1GCILIQ0",
            VIEW: "XCU5I93Y5HSG",
        },
        UMS: {
            CODE: "QRPRCWMZ17PP",
            CREATE: "Y5Z5VYX4TS0Z",
        },
        SETTINGS: {
            CODE: "QYTXQD2DQR08",
            CREATE: "3TE3WV2DJGGU",
            VIEW: "Q3E4358S3V3E",
            SCHEME: {

            }
        },
    },
    KAPIL_CAPITAL: {
        CODE: "6PKAQ7HMZ69Z",
        UNDERWRITING: {
            CODE: "HK0WN2OWCC3S",
            CREATE: "1UKHFNE3NJFF",
            DELETE: "4RZIBJRAXWQ8",
            UPDATE: "Q16PLPJUDTJ0",
            VIEW: "2XFIL5R9DN6O",
            REJECT: "EK1ISFYUMWJY",
            APPROVE: "EAD5TFOSQJ9U",
            DOWNLOAD_SANCTION: "RVT1YO5CBEWK",
            BANK: {
                CODE: "F03LMEVYJFJR",
                VIEW: "QPXNKAYELG0Z",
                CREATE: "JYBVLIMMWAGN",
                UPDATE: "WELZBCL1V615",
                DELETE: "4PU9LYX6EJMM"
            }
        },
        COMMON: {
            CLOSED_LOAN: {
                CODE: "IR4723HP7SZB",
                VIEW: "61CIANGI5JYW"
            },
            LOAN_DETAIL: {
                CODE: "HQSEWSQFWMY6",
                VIEW: "NVQ6BRAO66GY",
            },
            BORROWER_DETAIL: {
                CODE: "9WRNN4MJIJKE",
                VIEW: "O4USYVLZNMES"
            },
            TRACKING_HISTORY: {
                CODE: "941DVF29I68B",
                VIEW: "6L90R20GQ47G"
            },
            ACTIVE_LOAN: {
                CODE: "897SDMIJ4QMF",
                VIEW: "KD25IPWSDJ8L"
            },
            CREDIT_REPORT: {
                CODE: "2MOR98V9I36X",
                VIEW: "SWPK0MNB0G5E",
                REFRESH: "AWY2LVDRNY62",
                FETCH: "C8IKWHK6BK15",
                DOWNLOAD: "XTY1VUW86Z57"
            },
            PAST_APPLICATIONS: {
                CODE: "C3Q17JCC83LD",
                VIEW: "NO9FS53JCUI9"
            },
            DOCUMENTS: {
                CODE: "US42DJOFQA0V",
                VIEW: "F18EFRLG622C",
                UPLOAD: "678G0EPH0XXL",
                DOWNLOAD: "CVWFVB2VCL71",
                DELETE: "VAYTS8MMBTCZ"
            }
        },
        CLIENTS: {
            CODE: "OVJ5X6GEFLEF",
            CREATE: "SN7YOU2ZT50Y",
            DELETE: "8XWM7G8ZY5RC",
            UPDATE: "W6EPAKO8ENWS",
            VIEW: "YDJCN8VRKE2D",
            CREATE_APPLICATION: "3IKHAU0XRNJL",
            CONTACT_INFORMATION: {
                CODE: "ZH8I4EYH8L9E",
                VIEW: "",
            },
            GUARANTOR: {
                CODE: "RTUBI95B5V98",
                VIEW: ""
            },
            BANK: {
                CODE: "PFPFNOBRAHHR",
                VIEW: "DOUM32AOKIAK",
                CREATE: "KBNXMJAQGK2N",
                UPDATE: "D8R9QH2OQM8I",
                DELETE: "H6CUX2EG5DK6"
            },
            APP_STAGE: {
                CODE: "",
                VIEW: "",
            },


        },
        ORIGINATION: {
            CODE: "340WGMJ25TEX",
            CREATE: "HDB5AE2CH8VH",
            DELETE: "Y8NJE2MKFOAM",
            UPDATE: "O0X3AESMQ34H",
            VIEW: "NWUIVN9CNPAG",
            REJECT: "P4PMSGDK53H5",
            BANK: {
                CODE: "BUW6IXL5OEGE",
                VIEW: "GURLGEBEY0PF",
                CREATE: "D5I04YLY85O4",
                UPDATE: "MCRC8LHIBSCA",
                DELETE: "2IS8AYAGLR8J"
            },
            STEP_STATUS: {
                CODE: "N29YZ6MQ8P8C",
                VIEW: "7BITH59O066I",
                BYPASS: "UZTZV3H4S3K6"
            }
        },
        APPROVAL: {
            CODE: "HK0WN2OWCC3S",
            CREATE: "1UKHFNE3NJFF",
            DELETE: "4RZIBJRAXWQ8",
            UPDATE: "Q16PLPJUDTJ0",
            REJECT: 'EK1ISFYUMWJY',
            APPROVE: "EAD5TFOSQJ9U",
            DOWNLOAD_SANCTION: "RVT1YO5CBEWK",
            VIEW: "2XFIL5R9DN6O",
            BANK: {
                CODE: "F03LMEVYJFJR",
                VIEW: 'QPXNKAYELG0Z',
                CREATE: 'JYBVLIMMWAGN',
                UPDATE: 'WELZBCL1V615',
                DELETE: '4PU9LYX6EJMM'
            }
        },

        OPERATIONS: {
            CODE: "DO7VWL7730PL",
            CREATE: "GZB6Q7CP595G",
            DELETE: "2ERR3EE6KPEV",
            UPDATE: "W5FNKMZPTAXQ",
            VIEW: "3O9XPK58HZHB",
            DOWNLOAD_SANCTION: "TCVZ8WY6NVLM",
            BANK: {
                CODE: "V6ZKW5C7DXUL",
                VIEW: "OB6TNY1QF29Y",
                CREATE: "MB1DH43996ZR",
                UPDATE: "Y1QS9LMB52S1",
                DELETE: "ROPHUOP9QFPG"
            },
            DISBURSEMENT: {
                CODE: "PCDKUH2INE7L",
                SEND_FOR_DISBURSAL: "RD1ZWER4PV0W",
                DISBURSE: "BWN47O085OVD"
            }
        },
        ACCOUNTS: {
            CODE: "T0NP7YRSLYYB",
            CREATE: "MZHBACP7KQW1",
            DELETE: "HK8EHTSHK4VX",
            UPDATE: "LF30HMQ1FOU2",
            VIEW: "GX2K56LSYJ96",
            DELETE_ACCOUNT: "",
            SUMMARY: {
                CODE: "",
                VIEW: ""
            },
            REPAYMENT_SCHEDULE: {
                CODE: "",
                VIEW: "",
                DOWNLOAD: "",
            },
            REPAYMENT_HISTORY: {
                CODE: "",
                VIEW: "",

            },
            MAKE_PAYMENT: {
                CODE: "",
                PAY: ""
            },
            BANK: {
                CODE: "",
                VIEW: '',
                CREATE: '',
                UPDATE: '',
                DELETE: ''
            },
            FORECLOSE: {
                CODE: "",
                FORECLOSE: ""
            },

        },
    },
    ASSETIFY: {
        CODE: "OY04W7JHD7FK",
        COMMON: {
            
            CHECKER:{
                CODE: "FJ7BW3SW8PUV",
                CHECK: "TKGV7Z2O1WI9"
            },
            
            NOTES: {
                CODE: "3E3GOAM0YGDZ",
                VIEW: "JUQZWHTUBWLY",
                CREATE: "2ESORO4QXUM6",
                UPDATE: "C20WV420SCPR",
                DELETE: "1Y12C8PQDH67"
            },
            DOCUMENTS: {
                CODE: "5WI12YJSDV06",
                VIEW: "7V4NUM1E3NBA",
                UPLOAD: "EXQ6AVLKRZ67",
                DELETE: "J7TQ1U5IWYNY"
            },
            TRACKING_HISTORY: {
                CODE: "RC2Y4IIEY2HY",
                VIEW: "0CEI7HXDHE2I"
            },
            PAST_APPLICATIONS: {
                CODE: "XKLGTWTUIYFB",
                VIEW: "V1G50H95K1OA"
            },
            PAST_LOANS: {
                CODE: "5KQO28B03SSK",
                VIEW: "QFSWHQ5I9Z08"
            },
            APPLICATION_STEPPER: {
                CODE: "TA33OGO4OMR2",
                VIEW: "KZ8N1TC180GN"
            },
            RC_VALIDATION: {
                CODE: "EM3L0UDPCIC5",
                VIEW: "F9GG6R4YRMBG",
                VALIDATE: "EKA81CN7P257"
            },
            BORROWER_DETAILS: {
                CODE: "VGOB9PU2L2HE",
                VIEW: "E7UPMY5S5XMZ",
                CREATE: "2KH2RMC5YJIK",
                UPDATE: "KU4DXJU4X0O6",
                DELETE: "20FZCR9RU4N6"
            },
            ASSET_DETAILS: {
                CODE: "BMY0W336RYZM",
                VIEW: "7GXHT800S9JO",
                UPDATE_RC: "56BQ9YOADNLU"
            },
            LOAN_DETAILS: {
                CODE: "K7TWYDPIBBH5",
                VIEW: "Y805SLBOH6U0"
            },
            PROPERTY_DETAILS: {
                CODE: "5UUHZUF7DW4T",
                VIEW: "09LIYMDO0LUE",
                CREATE: "GMNCZIBHE5XX",
                UPDATE: "FAC9HIBDQ4UG",
                DELETE: "46S3P2M3Q25G"
            },
            DISBURSEMENT_DETAILS: {
                CODE: "XA5VULHI1VKT",
                VIEW: "D5EZDV1SVOTQ",
                CREATE: "KPVTZZXXUG09",
                UPDATE: "1IOMZAA3V2Q6",
                DELETE: "NJ2HTXOBSIO4"
            }
        },
        ORIGINATION: {
            CODE: "KFH64YRY8RJB",
            SEND_TO_UNDERWRITING: "0XBLVRIS18A8",
            CREATE: "9B9D3BSOMCJY",
            DELETE: "XDPRQ3D829HA",
            UPDATE: "IFMRRV4RA7XJ",
            VIEW: "R6Y3R11O20A9",
            IMPORT: "FIZJVV4JTDPD",
            EXPORT: "BS0OGUBXJDQA",
            DISPATCH_KYC_LINK: "YWZUPC1F4OY3",
            COBORROWER: {
                CODE: "YWZUPC1F4OY3",
                VIEW: "JGCQVHH9G7RL",
                CREATE: "C3XONW17YK1U",
                UPDATE: "QQM3MOK3X2GR",
                DELETE: "HLNNMMPZEW1B"
            },
            BANK: {
                CODE: "H0MUYF03LLCR",
                VIEW: "TWO4HI9ULA4C",
                CREATE: "X54DGHJ6I7QQ",
                UPDATE: "ZLN6Y0PK52CU",
                DELETE: "OWZ5V6JE3F9W",
            }
        },
        UNDERWRITING: {
            CODE: "6SF6MIZH856I",
            CREATE: "5HZHW4JQIBBJ",
            DELETE: "PF3W028BI5K4",
            UPDATE: "W0DTT4MLX9XZ",
            VIEW: "REQ1O93V10WU",
            SANCTION_DOWNLOAD: "EB35F42FEWKM",
            DISPATCH_SANCTION: "JCNNJJ3C7F6O",
            BANK: {
                CODE: "8WUGVQXXZG7D",
                CREATE: "4QQ1I542GQGN",
                UPDATE: "1UVFS3SYMCPR",
                DELETE: "78MHAHOLCHUY",
                VIEW: "LAEWAIYY4N7F",
            },
            CREDIT_REPORT: {
                CODE: "T1CP9AXAUNGV",
                VIEW: "3D80Q0RKPO88",
                REFRESH: "GC4K5ZX7G624",
                FETCH: "UV5AED5B66NV"
            },
            RC_VALIDATION: {
                CODE: "EM3L0UDPCIC5",
                VIEW: "F9GG6R4YRMBG",
                FETCH: "EKA81CN7P257"
            },
            ECW_SCORE: {
                CODE: "9JJDI20W415T",
                CALCULATE: ""
            },
            STATEMENT_ANALYTICS: {
                CODE: "PH2DWO53YX3G",
                VALIDATE: "",
                VIEW: ""
            },
            DEAL_PARAMETERS: {
                CODE: "V6RNJT0TH4TK",
                VIEW: "5QHVTMEJWW6X",
                UPDATE: "Q1BROH5BU2JL"
            },
            CO_BORROWER: {
                CODE: "NQEVS0HGMW89",
                CREATE: "LCWZORNIATFG",
                VIEW: "E4M6ZGDUP4C0",
                UPDATE: "1CE95EOGD0IX",
                DELETE: "YEJPWDQTY32Y"
            }
        },
        OPERATIONS: {
            CODE: "JQJV9WMC7VV6",
            // CREATE: "GZB6Q7CP595G",
            CREATE: "MPSA4A5YE93C",
            DELETE: "276YQSA0R90N",
            UPDATE: "454NK0CYZKL5",
            VIEW: "4WN24NH0QPJI",
            // DELETE: "2ERR3EE6KPEV",
            // UPDATE: "W5FNKMZPTAXQ",
            // VIEW: "3O9XPK58HZHB",
            DISPATCH_SANCTION: "EB35F42FEWKM",
            SANCTION_DOWNLOAD: "EB35F42FEWKM",
            BANK: {
                CODE: "HDGSHBCGXFAX",
                VIEW: "9Z34UTT7YEK1",
                CREATE: "PQFBN2Y8LNW7",
                UPDATE: "P4TGBEEYLU3D",
                DELETE: "1XN0OI2LNEIB",
            },
            PROCESSING_FEE: {
                CODE: "D3YQ2LBD3KY2",
                DISPATCH: "8A65K3JTNI4Q",
                RE_DISPATCH: "P8GIRS6L3OUG"
            },
            MANDATE: {
                CODE: "E7GKOM4M7U1R",
                VIEW: "RFZ26GMQK6J2",
                CREATE: "L4HMKF7F1EHW",
                UPDATE: "FV46YP27VA7S",
                DELETE: "WC6BZYGKFM2K"
            },
            REPAYMENT_SCHEDULE: {
                CODE: "E20DAOJLIJ81",
                VIEW: "GMG2ADHX1NRU"
            },
            LOAN_AGREEMENT: {
                CODE: "4ME469QPVP3N",
                DISPATCH: "0E2YZ070N5MV"
            },
            DISBURSEMENT: {
                CODE: "29D9NE6089H7",
                SEND_FOR_DISBURSAL: "QF1PUWPO8Z0Y",
                DISBURSE: "R50LBA70ERIG"
            },
            DEALER: {
                CODE: "5JKPDYZF8IAF",
                DISPATCH_DEALER_MAIL: 'PL18W9WK528K',
                RE_DISPATCH_DEALER_MAIL: "EWKLG0K0LEQ4",
                UPDATE_DEALER_MAIL: "6KCWMF0K0OUI"
            }
        },
        ACCOUNTS: {
            CODE: "LHWRZDBL1Q6A",
            VIEW: "SOQT1VFUSTGB",
            CREATE: "52IN62S1C67J",
            UPDATE: "80IMA5HNMF04",
            DELETE: "1NVVG020YLE3"
        },


    },
    LMS: {
        DASHBOARD: {
            CODE: "DD4O0A3832FX",
            VIEW: "XQ9NDVZ374BF"
        },
        LMS_DASHBOARD: {
            CODE: "E9LDXZZAXW2H",
            VIEW: "KV6KNV5Q49ZR"
        },
        LOS_DASHBOARD: {
            CODE: "9X9RBD47DPFG",
            VIEW: "3GMSG35HNHRD"
        },
        LOS_REPORTS: {
            CODE: "H5R4EI49V7SW",
            VIEW: "A51UXYDF2K83"
        },
        REPORTS: {
            CODE: "46LW3C3XMC3B",
            VIEW: "9YL835FA55QY"
        },
    },
    LMS_CORE: {
        CODE: "GBSYKGME1RLE",
        OVERVIEW: {
            CODE: "5LO8DCSM628U",
            VIEW: "E7U91JFJHUAQ"
        },
        REPAYMENT_SCHEDULE: {
            CODE: "EV25O9QC1TXD",
            VIEW: "5NQ8UHALYTK9",
            WAIVE: "0RAEGA43I6C7",
            VIEW_HISTORY: "AXVJKC0FRXDW"
        },
        LEDGER: {
            CODE: "U0PVDMZC6KN4",
            VIEW: "5W2PP8W8HKLM"
        },
        PAYMENTS: {
            CODE: "HO20Y13NRYE3",
            VIEW: "BD34BKCOJOB7",
            MAKE_PAYMENT: "W1XCZPU7INNF",
            MAKE_PART_PAYMENT: "AZZNQ49TU1M5"
        },
        NACH_PRESENTATION: {
            CODE: "ZM9K9SNEWPRO",
            VIEW: "63KZVXZSKWO9",
            CREATE: "FD4DBHX8G4ED",
            UPDATE: "4TAA5BC3MG0Y",
            CANCEL: "0AIQSDPIL8O2",
            PAUSE: "739MXI6DN5E3",
            RESUME: "WXMR0KQ05NBV",
            PRESENT_EMI: "L95PF80H7ZT8"
        },
        PENALTY_BOUNCE: {
            CODE: "LHECYJ6JW9T2",
        },
        TRANSACTION: {
            CODE: "ADISURM2JUUA",
            VIEW: "EXWR3N2MEWE5"
        },
        DISBURSEMENTS: {
            CODE: "9SWQDS6KWCFM",
            VIEW_TRANCHE: "HG2LDF1CY98U",
            CREATE_TRANCHE: "25AAEK3MN3DX",
            UPDATE_TRANCHE: "3IK9QRUMDBN0",
            DELETE_TRANCHE: "ACYW40T7YLEP"
        },
        AUDIT_TRAIL: {
            CODE: "NVWXTZHQ85DG",
            VIEW: "CK5AEO3O7CGI"
        }
    },
    COMMON: {
        CLIENTS: {
            CODE: "OVJ5X6GEFLEF",
            CREATE: "SN7YOU2ZT50Y",
            DELETE: "8XWM7G8ZY5RC",
            UPDATE: "W6EPAKO8ENWS",
            VIEW: "YDJCN8VRKE2D",
        },
        APPROVALS: {
            CODE: "HK0WN2OWCC3S",
            CREATE: "1UKHFNE3NJFF",
            DELETE: "4RZIBJRAXWQ8",
            UPDATE: "Q16PLPJUDTJ0",
            VIEW: "2XFIL5R9DN6O",
        },
        ADDITIONAL_OPERATIONS: {
            CODE: "E9LDXZZAXW2H",
            // CREATE: "MPSA4A5YE93C",
            // DELETE: "276YQSA0R90N",
            // UPDATE: "454NK0CYZKL5",
            // VIEW: "4WN24NH0QPJI",
        },
    },
    BUSINESS_LOAN: {
        CODE: "UXCJVTAK4B72",
        UNDERWRITING: {
            CODE: "FKV3SJRR68CU",
            VIEW: "OBBSP9PMAYTN",
            INTERNAL_QUERIES: {
                CODE: "UPVXV43ZP6J1",
            },
            STATEMENT_ANALYTICS: {
                CODE: "M7011ZAC3RFR",
                VIEW: "OZS6U4EB7U70",
                VALIDATE: "I8D2F92T45M1",
                DOWNLOAD: "1LWTIJQR4J1A"
            },
            DEAL_PARAMETERS: {
                CODE: "XDWC2GBDYPQ9",
                VIEW: "8WMA1UN01MKE",
                UPDATE: "X2IX7G2A9HA8"
            },
        },
        ORIGINATION: {
            CODE: "6U5DZ6KISEQB",
            VIEW: "9KEMEDNZOMB2",
            RISK_EVALUATION: {
                CODE: "QUTM8CNQ955A",
                VIEW: "VVTDOHXW9UK8"
            }
        },
        OPERATIONS: {
            CODE: "WI4T4Q17EC3Z",
            VIEW: "ROOFG6A043GG",
            DISBURSEMENT_DETAILS: {
                CODE: "3FVZQLE4CWU7",
                VIEW: "6Q253L8GW6CK"
            },
            NACH_ACTIVATION: {
                CODE: "C62KWTKH9X34",
                VIEW: "04FE1A03W225"
            },
            APPLICATION_STEPPER: {
                CODE: "B0KXX4NZ1DJY",
                VIEW: "7VM2HP327F0M"
            }
        },
        COMMON: {
            CODE: "5HM2O1XTX6KC",
            BORROWER_DETAILS: {
                CODE: "CKYBNOUK7JF6",
                VIEW: "KO2V3XM6OLZL",
                UPDATE: "FDCHWQYW5UT5",
            },
            DOCUMENTS: {
                CODE: "TTJDVH5OLUR0",
                VIEW: "NB5YCVQ499T0",
                UPDATE: "KP2T77O8TH8I",
                DELETE: "Q59L3J5FRKX0",
                DOWNLOAD: "OC8YZY1UPOKL",
                UPLOAD: "YFNC27291JA8",
            },
            TRACKING_HISTORY: {
                CODE: "RUKXLO9WW2HD",
                VIEW: "4KGICSQ9J7KQ",
            },
            BANK: {
                CODE: "2IHAQJX52L0R",
                VIEW: "L9CQBDQX1CNH",
                CREATE: "G4ZP14C9PWLB",
                UPDATE: "VV45ACWEYF4G",
                DELETE: "0305H1TR4NNS",
            },
            PAST_APPLICATIONS: {
                CODE: "7WVRXD5SW05N",
                VIEW: "V71RAFOKZ2YZ",
            },
            PAST_LOANS: {
                CODE: "PTV0XR5L3MO9",
                VIEW: "MAIULMN7Y33Y",
            },
            NOTES: {
                CODE: "H3IH8QC2AKLY",
                VIEW: "Q70KCB94OF7H",
                CREATE: "GX1HV1HUXWAZ",
                UPDATE: "B4IJ0OBH4ZG2",
                DELETE: "X8DMYUEH8RZV",
            },
            LOAN_DETAILS: {
                CODE: "0DW6RKWERPYR",
                VIEW: "PTVFIT35QBLE",
            }
        }
    }
} as const;



export enum ResourceAction {
    CREATE = "CREATE",
    READ = "READ",
    UPDATE = "UPDATE",
    DELETE = "DELETE",
}

export function generateActions(actions: {
    VIEW?: string,
    CREATE?: string,
    UPDATE?: string,
    DELETE?: string
}) {
    return {
        VIEW: actions.VIEW || "",
        CREATE: actions.CREATE || "",
        UPDATE: actions.UPDATE || "",
        DELETE: actions.DELETE || "",
    }
}`;
function ensureBarrelExport(filePath, exportLine) {
    try {
        fs_extra_1.default.ensureDirSync(path_1.default.dirname(filePath));
        let content = "";
        if (fs_extra_1.default.existsSync(filePath)) {
            content = fs_extra_1.default.readFileSync(filePath, "utf8");
        }
        const normalizedExport = exportLine.replace(/['"]/g, "'").trim();
        const hasExport = content
            .split("\n")
            .map(line => line.replace(/['"]/g, "'").trim())
            .some(line => line === normalizedExport);
        if (!hasExport) {
            const separator = content && !content.endsWith("\n") ? "\n" : "";
            fs_extra_1.default.writeFileSync(filePath, content + separator + exportLine + "\n", "utf8");
            console.log(chalk_1.default.green(`Added barrel export to ${path_1.default.relative(process.cwd(), filePath)}`));
        }
    }
    catch (error) {
        console.log(chalk_1.default.yellow(`Failed to update barrel export ${filePath}: ${error.message}`));
    }
}
function configureTurnstileInHtml(root) {
    const htmlPath = path_1.default.join(root, "index.html");
    if (!fs_extra_1.default.existsSync(htmlPath))
        return;
    try {
        let content = fs_extra_1.default.readFileSync(htmlPath, "utf8");
        const turnstileScript = `<script
  src="https://challenges.cloudflare.com/turnstile/v0/api.js"
  async
  defer
></script>`;
        if (!content.includes("challenges.cloudflare.com/turnstile")) {
            const headCloseIndex = content.indexOf("</head>");
            if (headCloseIndex !== -1) {
                content = content.substring(0, headCloseIndex) + "    " + turnstileScript + "\n  " + content.substring(headCloseIndex);
                fs_extra_1.default.writeFileSync(htmlPath, content, "utf8");
                console.log(chalk_1.default.green("Added Cloudflare Turnstile script to index.html head."));
            }
            else {
                console.log(chalk_1.default.yellow("Could not find </head> tag in index.html. Skipping script injection."));
            }
        }
        else {
            console.log(chalk_1.default.yellow("Cloudflare Turnstile script already present in index.html."));
        }
    }
    catch (error) {
        console.log(chalk_1.default.red(`Failed to configure Turnstile script in index.html: ${error.message}`));
    }
}
function configureEnums(root) {
    const enumsDir = path_1.default.join(root, "src/enums");
    let enumsFilePath = path_1.default.join(enumsDir, "index.tsx");
    if (!fs_extra_1.default.existsSync(enumsFilePath) && fs_extra_1.default.existsSync(path_1.default.join(enumsDir, "index.ts"))) {
        enumsFilePath = path_1.default.join(enumsDir, "index.ts");
    }
    if (!fs_extra_1.default.existsSync(enumsFilePath)) {
        fs_extra_1.default.ensureDirSync(enumsDir);
        fs_extra_1.default.writeFileSync(enumsFilePath, defaultEnumsContent, "utf8");
        console.log(chalk_1.default.green("Created src/enums/index.tsx with default resource permissions."));
    }
    else {
        // Check if RESOURCE_PERMISSIONS exists
        let content = fs_extra_1.default.readFileSync(enumsFilePath, "utf8");
        if (!content.includes("RESOURCE_PERMISSIONS")) {
            content += "\n\n" + defaultEnumsContent;
            fs_extra_1.default.writeFileSync(enumsFilePath, content, "utf8");
            console.log(chalk_1.default.green("Appended default resource permissions to src/enums index."));
        }
        else {
            console.log(chalk_1.default.yellow("src/enums index already contains resource permissions. Skipping configuration."));
        }
    }
}
async function ensureSettingsBarrelExports(root, registry, installedModules) {
    const settingsIndexFile = path_1.default.join(root, "src/pages/settings/index.ts");
    for (const mod of installedModules) {
        let itemPath = null;
        for (const [category, items] of Object.entries(registry)) {
            if (items[mod]) {
                itemPath = items[mod].path;
                break;
            }
        }
        if (itemPath) {
            try {
                const meta = await (0, registry_js_1.fetchItemMeta)(itemPath);
                if (meta.target && meta.target.startsWith("src/pages/settings/")) {
                    const relativeExportDir = meta.target.substring("src/pages/settings/".length);
                    if (relativeExportDir) {
                        const targetDir = path_1.default.join(root, meta.target);
                        const componentIndexFile = path_1.default.join(targetDir, "index.ts");
                        // If index.ts doesn't exist in the component directory, let's create it!
                        if (!fs_extra_1.default.existsSync(componentIndexFile)) {
                            const mainFile = meta.files && meta.files.length > 0 ? meta.files[0] : `${meta.name}.tsx`;
                            const mainFileBase = path_1.default.basename(mainFile, path_1.default.extname(mainFile));
                            fs_extra_1.default.ensureDirSync(targetDir);
                            fs_extra_1.default.writeFileSync(componentIndexFile, `export * from "./${mainFileBase}";\n`, "utf8");
                            console.log(chalk_1.default.green(`Created component level barrel export: ${path_1.default.relative(root, componentIndexFile)}`));
                        }
                        ensureBarrelExport(settingsIndexFile, `export * from './${relativeExportDir}';`);
                    }
                }
            }
            catch (error) {
                console.log(chalk_1.default.yellow(`Warning: failed to build barrel export for ${mod}: ${error.message}`));
            }
        }
    }
}
function scanRoutes(root) {
    let filePath = path_1.default.join(root, "src/routes/app.routes.tsx");
    if (!fs_extra_1.default.existsSync(filePath)) {
        filePath = path_1.default.join(root, "src/routes/app.routes.ts");
        if (!fs_extra_1.default.existsSync(filePath)) {
            filePath = path_1.default.join(root, "src/App.tsx");
            if (!fs_extra_1.default.existsSync(filePath)) {
                filePath = path_1.default.join(root, "src/App.jsx");
                if (!fs_extra_1.default.existsSync(filePath)) {
                    return { filePath: "", routes: [] };
                }
            }
        }
    }
    const content = fs_extra_1.default.readFileSync(filePath, "utf8");
    const routes = new Set();
    // Match path="..." or path={...}
    const pathRegex = /path\s*=\s*[{'"]([^'"\s}]+)['"}]/g;
    let match;
    while ((match = pathRegex.exec(content)) !== null) {
        const p = match[1];
        if (p !== "/" && !p.includes("login") && !p.includes("LOGIN") && !p.includes("unauthorized") && !p.includes("UNAUTHORIZED")) {
            routes.add(p);
        }
    }
    // Match layout functions: {SettingsRoute()}, {OriginationRoute()}
    const functionRouteRegex = /\{(\w+Route(s)?)\(\)\}/g;
    while ((match = functionRouteRegex.exec(content)) !== null) {
        routes.add(`${match[1]}()`);
    }
    return { filePath, routes: Array.from(routes) };
}
function wrapRoutesInLayout(filePath, selectedRoutes, wrapAll) {
    if (!fs_extra_1.default.existsSync(filePath))
        return;
    let content = fs_extra_1.default.readFileSync(filePath, "utf8");
    // 1. Ensure imports exist
    if (!content.includes("RootLayout") && !content.includes("ProtectedRoute")) {
        content = `import { RootLayout, ProtectedRoute } from "@/components";\nimport { Outlet } from "react-router-dom";\n` + content;
    }
    // 2. Identify return statement JSX
    const returnRegex = /(return\s*\(\s*<>)([\s\S]*?)(<\/>\s*\))/;
    const routesRegex = /(return\s*\(\s*<Routes>)([\s\S]*?)(<\/Routes>\s*\))/;
    let match = content.match(returnRegex) || content.match(routesRegex);
    if (!match)
        return;
    const header = match[1];
    const innerContent = match[2];
    const footer = match[3];
    // Split lines
    const lines = innerContent.split("\n");
    const protectedLines = [];
    const publicLines = [];
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed === "")
            continue;
        // If it is a login or unauthorized route, it should remain public
        if (trimmed.includes("login") || trimmed.includes("LOGIN") || trimmed.includes("unauthorized") || trimmed.includes("UNAUTHORIZED")) {
            publicLines.push(line);
            continue;
        }
        let protectThis = false;
        if (wrapAll) {
            protectThis = true;
        }
        else {
            for (const route of selectedRoutes) {
                if (trimmed.includes(route)) {
                    protectThis = true;
                    break;
                }
            }
        }
        if (protectThis) {
            protectedLines.push("        " + trimmed);
        }
        else {
            publicLines.push(line);
        }
    }
    // Construct new return JSX
    let newInnerContent = "";
    if (protectedLines.length > 0) {
        newInnerContent += `\n      <Route\n        path="/"\n        element={\n          <RootLayout>\n            <ProtectedRoute>\n              <Outlet />\n            </ProtectedRoute>\n          </RootLayout>\n        }\n      >\n${protectedLines.join("\n")}\n      </Route>\n`;
    }
    newInnerContent += publicLines.join("\n");
    const updatedBlock = `${header}${newInnerContent}\n    ${footer}`;
    content = content.replace(match[0], updatedBlock);
    // Check if 'import { Route }' exists. If not, make sure it is imported from 'react-router-dom'.
    if (!content.includes("Route") && !content.includes("react-router-dom")) {
        content = `import { Route } from "react-router-dom";\n` + content;
    }
    else if (content.includes("react-router-dom") && !content.includes("Route")) {
        content = content.replace(/import\s+{[^}]*}\s+from\s+["']react-router-dom["']/g, (m) => {
            return m.replace("}", ", Route }");
        });
    }
    fs_extra_1.default.writeFileSync(filePath, content, "utf8");
    console.log(chalk_1.default.green(`Protected selected routes under RootLayout in ${path_1.default.basename(filePath)}`));
}
function updateSidebarConfig(root, enabledCategories) {
    const configFilePath = path_1.default.join(root, "src/components/sidebar.config.ts");
    if (!fs_extra_1.default.existsSync(configFilePath))
        return;
    try {
        let sidebarContent = fs_extra_1.default.readFileSync(configFilePath, "utf8");
        for (const section of SIDEBAR_SECTIONS) {
            const isEnabled = enabledCategories.includes(section.key);
            const placeholderTag = `// {ALFIN_SIDEBAR_${section.placeholder}}`;
            const enabledTag = `sidebarSettingsItemsMap["${section.key}"],`;
            if (isEnabled) {
                if (sidebarContent.includes(placeholderTag)) {
                    sidebarContent = sidebarContent.replace(placeholderTag, enabledTag);
                }
            }
            else {
                if (sidebarContent.includes(enabledTag)) {
                    sidebarContent = sidebarContent.replace(enabledTag, placeholderTag);
                }
            }
        }
        fs_extra_1.default.writeFileSync(configFilePath, sidebarContent, "utf8");
        console.log(chalk_1.default.green("Updated src/components/sidebar.config.ts successfully."));
    }
    catch (error) {
        console.log(chalk_1.default.red(`Failed to update sidebar.config.ts: ${error.message}`));
    }
}
exports.applyAuthCommand = new commander_1.Command()
    .name("apply-auth")
    .description("Apply Authentication setup to target project")
    .action(async () => {
    const root = (0, paths_js_1.getProjectRoot)();
    const spinner = (0, ora_1.default)(`Fetching registry index...`).start();
    try {
        const registry = await (0, registry_js_1.fetchRegistryIndex)();
        spinner.stop();
        // 1. Prompt for Automatic or Manual setup using "select" type
        const modeAnswer = await inquirer_1.default.prompt([
            {
                type: "select",
                name: "setupMode",
                message: "Select Auth Setup Mode:",
                choices: [
                    { name: "Automatic Setup (CLI installs components and configures routes/providers)", value: "automatic" },
                    { name: "Manual Setup (CLI only downloads components, you configure routing/providers manually)", value: "manual" }
                ]
            }
        ]);
        const isAutomatic = modeAnswer.setupMode === "automatic";
        // 2. Ask whether to setup routes
        const routesAnswer = await inquirer_1.default.prompt([
            {
                type: "confirm",
                name: "setupRoutes",
                message: "Would you like to setup routes?",
                default: true
            }
        ]);
        let selectedRoutes = [];
        if (routesAnswer.setupRoutes) {
            const routesSelect = await inquirer_1.default.prompt([
                {
                    type: "checkbox",
                    name: "routes",
                    message: "Select which routes to add:",
                    choices: [
                        { name: "Login Route", value: "login", checked: true },
                        { name: "Unauthorized Page Route", value: "unauthorized", checked: true }
                    ],
                    default: ["login", "unauthorized"]
                }
            ]);
            selectedRoutes = routesSelect.routes;
        }
        // 3. Ask whether to setup cryptography
        const cryptoAnswer = await inquirer_1.default.prompt([
            {
                type: "confirm",
                name: "setupCrypto",
                message: "Would you like to configure a cryptography utility (encrypt/decrypt)?",
                default: true
            }
        ]);
        let secretKey = "";
        let initVector = "";
        if (cryptoAnswer.setupCrypto) {
            const cryptoKeys = await inquirer_1.default.prompt([
                {
                    type: "input",
                    name: "secretKey",
                    message: "Enter VITE_SECRET_KEY for encryption (Base64 encoded key):",
                    default: "YTIzNDU2Nzg5MDEyMzQ1Ng=="
                },
                {
                    type: "input",
                    name: "initVector",
                    message: "Enter VITE_INIT_VECTOR for encryption (16 characters):",
                    default: "1234567890123456"
                }
            ]);
            secretKey = cryptoKeys.secretKey;
            initVector = cryptoKeys.initVector;
        }
        // Turnstile site key prompt
        const turnstileAnswer = await inquirer_1.default.prompt([
            {
                type: "input",
                name: "siteKey",
                message: "Enter VITE_TURNSTILE_SITE_KEY for Cloudflare Turnstile CAPTCHA (or press enter for dummy test key):",
                default: "1x00000000000000000000AA"
            }
        ]);
        const turnstileSiteKey = turnstileAnswer.siteKey;
        // Enums configuration prompt
        const enumsPrompt = await inquirer_1.default.prompt([
            {
                type: "confirm",
                name: "setupEnums",
                message: "Would you like to configure standard resource permissions inside src/enums/index.tsx?",
                default: true
            }
        ]);
        // Interceptors prompt
        const interceptorPrompt = await inquirer_1.default.prompt([
            {
                type: "confirm",
                name: "setupInterceptors",
                message: "Would you like to configure API client interceptors (LMS / SETTINGS)?",
                default: true
            }
        ]);
        // AppContext prompt
        const appContextPrompt = await inquirer_1.default.prompt([
            {
                type: "confirm",
                name: "setupAppContext",
                message: "Would you like to configure AppContext and AppProvider?",
                default: true
            }
        ]);
        // 4. Ask whether to install RootLayout & ProtectedRoute wrapping
        const layoutAnswer = await inquirer_1.default.prompt([
            {
                type: "confirm",
                name: "setupLayout",
                message: "Would you like to add RootLayout and protect routes using ProtectedRoute?",
                default: true
            }
        ]);
        let wrapAllRoutes = false;
        let routesToWrap = [];
        let enabledCategories = [];
        let downloadSidebarItems = false;
        let finalModulesToInstall = [];
        let finalRoutesToInstall = [];
        if (layoutAnswer.setupLayout) {
            // Scan for existing routes
            const scanned = scanRoutes(root);
            if (scanned.routes.length > 0) {
                const wrapChoices = [
                    { name: "All routes (except /login)", value: "all" },
                    ...scanned.routes.map(r => ({ name: `Specific Route: ${r}`, value: r }))
                ];
                const wrapAnswer = await inquirer_1.default.prompt([
                    {
                        type: "checkbox",
                        name: "wrapRoutes",
                        message: "Select which routes to wrap / protect inside RootLayout & ProtectedRoute:",
                        choices: wrapChoices,
                        default: ["all"]
                    }
                ]);
                routesToWrap = wrapAnswer.wrapRoutes;
                if (routesToWrap.includes("all")) {
                    wrapAllRoutes = true;
                }
            }
            else {
                console.log(chalk_1.default.yellow("No routes found in App.tsx or app.routes.tsx to protect. Wrapping all routes by default."));
                wrapAllRoutes = true;
            }
            // Prompt for Granular Sidebar Categories
            const sidebarCategoriesAnswer = await inquirer_1.default.prompt([
                {
                    type: "checkbox",
                    name: "categories",
                    message: "Select which sidebar categories you want to enable:",
                    choices: [
                        { name: "Select All Categories", value: "all", checked: true },
                        ...SIDEBAR_SECTIONS.map(s => ({ name: s.name, value: s.key }))
                    ],
                    default: ["all"]
                }
            ]);
            let selectedCategories = sidebarCategoriesAnswer.categories;
            if (selectedCategories.includes("all")) {
                enabledCategories = SIDEBAR_SECTIONS.map(s => s.key);
                finalModulesToInstall = SIDEBAR_SECTIONS.flatMap(s => s.modules);
                finalRoutesToInstall = SIDEBAR_SECTIONS.flatMap(s => s.routes);
            }
            else {
                enabledCategories = selectedCategories;
                // For each selected category, ask to enable all or customize specific items
                for (const key of selectedCategories) {
                    const section = SIDEBAR_SECTIONS.find(s => s.key === key);
                    if (!section)
                        continue;
                    if (section.modules.length > 0) {
                        const itemAnswer = await inquirer_1.default.prompt([
                            {
                                type: "list",
                                name: "itemConfig",
                                message: `Configure items for category "${section.name}":`,
                                choices: [
                                    { name: "Enable all items in this category", value: "all" },
                                    { name: "Select specific items in this category", value: "customize" }
                                ]
                            }
                        ]);
                        if (itemAnswer.itemConfig === "all") {
                            finalModulesToInstall.push(...section.modules);
                        }
                        else {
                            const specificItems = await inquirer_1.default.prompt([
                                {
                                    type: "checkbox",
                                    name: "modules",
                                    message: `Select items to enable in "${section.name}":`,
                                    choices: section.modules.map(m => ({ name: m, value: m, checked: true }))
                                }
                            ]);
                            finalModulesToInstall.push(...specificItems.modules);
                        }
                    }
                    finalRoutesToInstall.push(...section.routes);
                }
            }
            // Ask whether to automatically download routes and components
            const downloadAnswer = await inquirer_1.default.prompt([
                {
                    type: "confirm",
                    name: "downloadItems",
                    message: "Would you like to automatically download and apply routes and components for the selected sidebar items?",
                    default: true
                }
            ]);
            downloadSidebarItems = downloadAnswer.downloadItems;
        }
        // Start downloading components
        spinner.start("Installing auth components...");
        // Download base auth items
        await (0, add_js_1.installItem)("auth-provider", registry, spinner);
        await (0, add_js_1.installItem)("login", registry, spinner);
        await (0, add_js_1.installItem)("unauthorized", registry, spinner);
        await (0, add_js_1.installItem)("private-route", registry, spinner);
        await (0, add_js_1.installItem)("protected-route", registry, spinner);
        await (0, add_js_1.installItem)("app-loader", registry, spinner);
        await (0, add_js_1.installItem)("new-login", registry, spinner);
        await (0, add_js_1.installItem)("use-redirect-with-permissions", registry, spinner);
        await (0, add_js_1.installItem)("auth-types", registry, spinner);
        // Write keys and turnstile site key to .env
        const envPath = path_1.default.join(root, ".env");
        let envContent = "";
        if (fs_extra_1.default.existsSync(envPath)) {
            envContent = fs_extra_1.default.readFileSync(envPath, "utf8");
        }
        const updateEnvVar = (content, key, value) => {
            const regex = new RegExp(`^${key}=.*$`, "m");
            if (regex.test(content)) {
                return content.replace(regex, `${key}=${value}`);
            }
            return content + (content.endsWith("\n") || content === "" ? "" : "\n") + `${key}=${value}\n`;
        };
        if (cryptoAnswer.setupCrypto) {
            await (0, add_js_1.installItem)("encryption", registry, spinner);
            envContent = updateEnvVar(envContent, "VITE_SECRET_KEY", secretKey);
            envContent = updateEnvVar(envContent, "VITE_INIT_VECTOR", initVector);
        }
        envContent = updateEnvVar(envContent, "VITE_TURNSTILE_SITE_KEY", turnstileSiteKey);
        fs_extra_1.default.writeFileSync(envPath, envContent, "utf8");
        spinner.text = "Saved credentials to .env";
        // Configure Enums
        if (enumsPrompt.setupEnums) {
            configureEnums(root);
        }
        // Configure Turnstile Script in HTML
        configureTurnstileInHtml(root);
        // Configure Interceptors
        if (interceptorPrompt.setupInterceptors) {
            spinner.text = "Installing interceptors...";
            await (0, add_js_1.installItem)("LMS", registry, spinner);
            await (0, add_js_1.installItem)("SETTINGS", registry, spinner);
            // Barrel exports for interceptor
            ensureBarrelExport(path_1.default.join(root, "src/interceptor/index.ts"), "export * from './lms-client';");
            ensureBarrelExport(path_1.default.join(root, "src/interceptor/index.ts"), "export * from './settings-client';");
        }
        // Configure AppContext if selected
        if (appContextPrompt.setupAppContext) {
            spinner.text = "Configuring AppContext...";
            const contextsDir = path_1.default.join(root, "src/contexts");
            fs_extra_1.default.ensureDirSync(contextsDir);
            const appContextContent = `import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type LeadSource = "PERSONAL_LOAN" | "VEHICLE_LOAN" | "ALFIN" | "HEYLON" | "";

export interface AppContextType {
  leadSource: LeadSource;
  setLeadSource: (value: LeadSource) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const APP_LEAD_SOURCE_KEY = "leadSource";

const normalizeStoredLeadSource = (value: string | null): LeadSource => {
  if (
    value === "PERSONAL_LOAN" ||
    value === "VEHICLE_LOAN" ||
    value === "ALFIN" ||
    value === "HEYLON"
  ) {
    return value;
  }
  return "PERSONAL_LOAN";
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [leadSource, setLeadSourceState] = useState<LeadSource>(() => {
    return normalizeStoredLeadSource(localStorage.getItem(APP_LEAD_SOURCE_KEY));
  });

  const setLeadSource = (value: LeadSource) => {
    setLeadSourceState(value);
  };

  useEffect(() => {
    localStorage.setItem(APP_LEAD_SOURCE_KEY, leadSource);
  }, [leadSource]);

  const value = useMemo(
    () => ({
      leadSource,
      setLeadSource,
    }),
    [leadSource],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useAppContext must be used inside AppProvider");
  }
  return context;
};
`;
            const appProviderContent = `import React, { createContext, useContext, useState } from "react";

interface AppContextType {
  selectedProduct: string | null;
  setSelectedProduct: (product: string | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedProduct, setSelectedProductState] = useState<string | null>(() => {
    return localStorage.getItem("selectedProduct");
  });

  const setSelectedProduct = (product: string | null) => {
    setSelectedProductState(product);
    if (product) {
      localStorage.setItem("selectedProduct", product);
    } else {
      localStorage.removeItem("selectedProduct");
    }
  };

  return (
    <AppContext.Provider value={{ selectedProduct, setSelectedProduct }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error("useApp must be used within an AppProvider");
  }
  return context;
};
`;
            fs_extra_1.default.writeFileSync(path_1.default.join(contextsDir, "app-context.tsx"), appContextContent, "utf8");
            fs_extra_1.default.writeFileSync(path_1.default.join(contextsDir, "app-provider.tsx"), appProviderContent, "utf8");
            console.log(chalk_1.default.green("Configured AppContext and AppProvider source files."));
        }
        // If Layout selected, install layout items and sidebar components
        if (layoutAnswer.setupLayout) {
            spinner.text = "Installing root layout and sidebar components...";
            await (0, add_js_1.installItem)("root-layout", registry, spinner);
            await (0, add_js_1.installItem)("app-sidebar", registry, spinner);
            // Download sidebar modules and routes
            if (downloadSidebarItems) {
                for (const mod of finalModulesToInstall) {
                    spinner.text = `Downloading module component: ${mod}...`;
                    try {
                        await (0, add_js_1.installItem)(mod, registry, spinner);
                    }
                    catch (e) {
                        console.log(chalk_1.default.yellow(`Warning: module '${mod}' not found or failed to install: ${e.message}`));
                    }
                }
                for (const rte of finalRoutesToInstall) {
                    spinner.text = `Downloading route component: ${rte}...`;
                    try {
                        await (0, add_js_1.installItem)(rte, registry, spinner);
                    }
                    catch (e) {
                        console.log(chalk_1.default.yellow(`Warning: route '${rte}' not found or failed to install: ${e.message}`));
                    }
                }
            }
            // Update sidebar.config.ts
            updateSidebarConfig(root, enabledCategories);
            // Wrap protected routes inside App.tsx or app.routes.tsx
            const scanned = scanRoutes(root);
            if (scanned.filePath) {
                wrapRoutesInLayout(scanned.filePath, routesToWrap, wrapAllRoutes);
            }
        }
        // Configure routes map in src/enums/routes.ts
        const enumsDir = path_1.default.join(root, "src/enums");
        const routesEnumPath = path_1.default.join(enumsDir, "routes.ts");
        fs_extra_1.default.ensureDirSync(enumsDir);
        let routesEnumContent = "";
        if (fs_extra_1.default.existsSync(routesEnumPath)) {
            routesEnumContent = fs_extra_1.default.readFileSync(routesEnumPath, "utf8");
        }
        const loginRoutePath = "/login";
        const unauthorizedRoutePath = "/unauthorized";
        if (!routesEnumContent.includes("export const APP")) {
            routesEnumContent += `\nexport const APP = {
  LOGIN: "${loginRoutePath}",
  UNAUTHORIZED: "${unauthorizedRoutePath}",
};\n`;
        }
        else {
            // Update export APP
            if (!routesEnumContent.includes("LOGIN:")) {
                routesEnumContent = routesEnumContent.replace("export const APP = {", `export const APP = {\n  LOGIN: "${loginRoutePath}",`);
            }
            if (!routesEnumContent.includes("UNAUTHORIZED:")) {
                routesEnumContent = routesEnumContent.replace("export const APP = {", `export const APP = {\n  UNAUTHORIZED: "${unauthorizedRoutePath}",`);
            }
        }
        fs_extra_1.default.writeFileSync(routesEnumPath, routesEnumContent, "utf8");
        console.log(chalk_1.default.green("Configured APP.LOGIN routes map in src/enums/routes.ts"));
        if (isAutomatic && routesAnswer.setupRoutes) {
            // Setup login.routes.tsx in target routes folder
            const routesDir = path_1.default.join(root, "src/routes");
            fs_extra_1.default.ensureDirSync(routesDir);
            const loginRoutesPath = path_1.default.join(routesDir, "login.routes.tsx");
            let loginRoutesContent = `import { Route } from "react-router-dom";
import { Login, Unauthorized } from "@/pages";
import { APP } from "@/enums/routes";

export const LoginRoutes = () => {
  return (
    <>
`;
            if (selectedRoutes.includes("login")) {
                loginRoutesContent += `      <Route path={APP.LOGIN} element={<Login />} />\n`;
            }
            if (selectedRoutes.includes("unauthorized")) {
                loginRoutesContent += `      <Route path={APP.UNAUTHORIZED} element={<Unauthorized />} />\n`;
            }
            loginRoutesContent += `    </>
  );
};
`;
            fs_extra_1.default.writeFileSync(loginRoutesPath, loginRoutesContent, "utf8");
            console.log(chalk_1.default.green("Created login.routes.tsx inside routes folder."));
            // Setup/configure app.routes.tsx or app.routes.ts
            let appRoutesFile = path_1.default.join(routesDir, "app.routes.tsx");
            if (!fs_extra_1.default.existsSync(appRoutesFile)) {
                const tsFile = path_1.default.join(routesDir, "app.routes.ts");
                if (fs_extra_1.default.existsSync(tsFile)) {
                    appRoutesFile = tsFile;
                }
            }
            let createAppRoutes = false;
            if (!fs_extra_1.default.existsSync(appRoutesFile)) {
                spinner.stop();
                const confirmAppRoutes = await inquirer_1.default.prompt([
                    {
                        type: "confirm",
                        name: "createAppRoutes",
                        message: "app.routes.tsx not found. Would you like to create it?",
                        default: true
                    }
                ]);
                spinner.start();
                createAppRoutes = confirmAppRoutes.createAppRoutes;
            }
            else {
                createAppRoutes = true; // It already exists
            }
            if (createAppRoutes) {
                let appRoutesContent = "";
                if (fs_extra_1.default.existsSync(appRoutesFile)) {
                    appRoutesContent = fs_extra_1.default.readFileSync(appRoutesFile, "utf8");
                }
                else {
                    appRoutesContent = `import { Routes } from "react-router-dom";
import { LoginRoutes } from "@/routes/login.routes";

export const AppRoutes = () => {
  return (
    <Routes>
      {LoginRoutes()}
    </Routes>
  );
};
`;
                }
                // Import LoginRoutes if not present
                if (!appRoutesContent.includes("LoginRoutes")) {
                    appRoutesContent = `import { LoginRoutes } from "@/routes/login.routes";\n` + appRoutesContent;
                    // Inject {LoginRoutes()} inside AppRoutes element
                    const routesRegex = /(return\s*\(\s*<Routes>[\s\S]*?)(<\/Routes>)/;
                    const reactRouterRegex = /(return\s*\(\s*<>[\s\S]*?)(<\/>\s*\))/;
                    if (routesRegex.test(appRoutesContent)) {
                        appRoutesContent = appRoutesContent.replace(routesRegex, `$1  {LoginRoutes()}\n      $2`);
                    }
                    else if (reactRouterRegex.test(appRoutesContent)) {
                        appRoutesContent = appRoutesContent.replace(reactRouterRegex, `$1  {LoginRoutes()}\n    $2`);
                    }
                }
                fs_extra_1.default.writeFileSync(appRoutesFile, appRoutesContent, "utf8");
                console.log(chalk_1.default.green(`Configured LoginRoutes inside ${path_1.default.basename(appRoutesFile)}`));
            }
        }
        // AUTOMATIC BARREL EXPORTS
        spinner.text = "Creating barrel exports...";
        // If layout was set up, ensure settings barrel exports
        if (layoutAnswer.setupLayout && downloadSidebarItems && finalModulesToInstall.length > 0) {
            await ensureSettingsBarrelExports(root, registry, finalModulesToInstall);
        }
        if (appContextPrompt.setupAppContext) {
            ensureBarrelExport(path_1.default.join(root, "src/contexts/index.ts"), "export { useAppContext } from './app-context';");
            ensureBarrelExport(path_1.default.join(root, "src/contexts/index.ts"), "export * from './app-provider';");
        }
        ensureBarrelExport(path_1.default.join(root, "src/pages/auth/index.ts"), "export * from './login';");
        ensureBarrelExport(path_1.default.join(root, "src/pages/auth/index.ts"), "export * from './unauthorized';");
        ensureBarrelExport(path_1.default.join(root, "src/pages/index.ts"), "export * from './auth';");
        if (fs_extra_1.default.existsSync(path_1.default.join(root, "src/pages/settings"))) {
            ensureBarrelExport(path_1.default.join(root, "src/pages/index.ts"), "export * from './settings';");
        }
        ensureBarrelExport(path_1.default.join(root, "src/auth/index.ts"), "export * from './private-route';");
        ensureBarrelExport(path_1.default.join(root, "src/components/auth/index.ts"), "export * from './protected-route';");
        ensureBarrelExport(path_1.default.join(root, "src/components/auth/index.ts"), "export * from './new-login';");
        ensureBarrelExport(path_1.default.join(root, "src/components/auth/index.ts"), "export * from './reset-password';");
        ensureBarrelExport(path_1.default.join(root, "src/hooks/index.ts"), "export * from './use-redirect-with-permissions';");
        ensureBarrelExport(path_1.default.join(root, "src/types/index.ts"), "export * from './auth-types';");
        ensureBarrelExport(path_1.default.join(root, "src/components/index.ts"), "export * from './auth';");
        if (layoutAnswer.setupLayout) {
            ensureBarrelExport(path_1.default.join(root, "src/components/layouts/index.ts"), "export * from './root-layout/root-layout';");
            ensureBarrelExport(path_1.default.join(root, "src/components/layouts/index.ts"), "export * from './root-layout/header';");
            ensureBarrelExport(path_1.default.join(root, "src/components/index.ts"), "export * from './layouts';");
            ensureBarrelExport(path_1.default.join(root, "src/components/index.ts"), "export * from './app-sidebar';");
        }
        if (fs_extra_1.default.existsSync(path_1.default.join(root, "src/components/ui/app-loader.tsx"))) {
            ensureBarrelExport(path_1.default.join(root, "src/components/ui/index.ts"), "export * from './app-loader';");
            ensureBarrelExport(path_1.default.join(root, "src/components/index.ts"), "export * from './ui';");
        }
        if (cryptoAnswer.setupCrypto) {
            ensureBarrelExport(path_1.default.join(root, "src/utils/index.ts"), "export * from './encryption';");
        }
        ensureBarrelExport(path_1.default.join(root, "src/contexts/index.ts"), "export * from './auth-provider';");
        let enumsIndexFile = path_1.default.join(root, "src/enums/index.tsx");
        if (!fs_extra_1.default.existsSync(enumsIndexFile)) {
            const tsFile = path_1.default.join(root, "src/enums/index.ts");
            if (fs_extra_1.default.existsSync(tsFile)) {
                enumsIndexFile = tsFile;
            }
            else {
                enumsIndexFile = path_1.default.join(root, "src/enums/index.tsx");
            }
        }
        ensureBarrelExport(enumsIndexFile, "export * from './routes';");
        spinner.succeed("Authentication setup applied successfully!");
    }
    catch (error) {
        spinner.fail(`Failed to apply authentication setup: ${error.message}`);
    }
});
