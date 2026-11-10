import type { Difficulty, Domain, ItemKind, PracticeItem, SubItem, Topic } from './types';
import { makeItem } from './catalog';
import { slug } from '../lib/id';

/**
 * AlgoCamp "Advanced Hands On System Design (HLD + LLD)" course, as skill-tree cards.
 * Source: AlgoCamp_System_Design_Lecture_List.xlsx (sheet "All Lectures"; the "App cards"
 * sheet lists the same cards). Each course section is a card; its lectures become steps:
 * a video gets one "watch" step per 10 minutes plus a 10-minute notes step, a live session
 * a watch and a notes step, a PDF / article / test one step. Every card ends with three
 * buffer steps for extra research.
 */

type LectureType = 'V' | 'L' | 'P' | 'A' | 'T';
/** [section, lecture number, title, type, minutes (0 = not shown)] */
type Lecture = [number, number, string, LectureType, number];
interface Card {
  topic: string;
  title: string;
  kind: ItemKind;
  difficulty?: Difficulty;
  /** Other names the same card may already have in a journey. */
  aliases?: string[];
  lectures: Lecture[];
}

export const ALGOCAMP_TAG = 'algocamp';

export const ALGOCAMP_TOPICS: Topic[] = [
  { id: "hld-cloud", domain: "hld", name: "Cloud & AWS", tier: 1, prerequisites: ["hld-foundations"], target: 0, description: "EC2, IAM, VPC, DynamoDB, Redshift, Kinesis, Glue" },
  { id: "hld-distributed", domain: "hld", name: "Distributed Systems Deep Dive", tier: 3, prerequisites: ["hld-consistency"], target: 0, description: "Clocks, CRDTs, consensus (RAFT, Paxos), case studies" },
  { id: "hld-dist-txn", domain: "hld", name: "Distributed Transactions", tier: 3, prerequisites: ["hld-consistency", "hld-databases"], target: 0, description: "2PC, sagas, CQRS" },
  { id: "hld-bigdata", domain: "hld", name: "Big Data & Search", tier: 3, prerequisites: ["hld-databases", "hld-messaging"], target: 0, description: "Hadoop, data lakes, Elasticsearch, streaming counts" },
  { id: "lld-concurrency", domain: "lld", name: "Concurrency", tier: 3, prerequisites: ["lld-quality"], target: 0, description: "Threads, locks, concurrent programming" },
];

// prettier-ignore
const CARDS: Card[] = [
  { topic: "hld-foundations", title: "System design terminologies", kind: "concept", lectures: [
    [30, 1, "Understanding Basics of System Design", "L", 0],
    [30, 2, "Class Notes", "P", 0],
    [30, 3, "Domain Name System and Rate Limiting", "L", 0],
    [30, 4, "DNS Notes", "P", 0],
    [30, 5, "Rate Limiter Notes", "P", 0],
    [30, 6, "Video lesson 1", "V", 22],
    [30, 7, "Video lesson 2", "V", 16],
    [30, 8, "Video lesson 3", "V", 32],
    [30, 9, "System design terminlogies", "P", 0],
    [30, 10, "Latency & Throughput notes", "P", 0],
  ] },
  { topic: "hld-foundations", title: "Scalability & availability", kind: "concept", lectures: [
    [32, 1, "Live lesson 1", "L", 0],
    [32, 2, "Live lesson 2", "L", 0],
    [32, 3, "Notes 1", "P", 0],
    [32, 4, "Notes 2", "P", 0],
  ] },
  { topic: "hld-foundations", title: "REST API basics", kind: "concept", lectures: [
    [33, 1, "Video lesson 1", "V", 21],
    [33, 2, "Video lesson 2", "V", 9],
    [33, 3, "Video lesson 3", "V", 2],
    [33, 4, "Video lesson 4", "V", 3],
    [33, 5, "Video lesson 5", "V", 14],
    [33, 6, "Video lesson 6", "V", 2],
    [33, 7, "Video lesson 7", "V", 11],
    [33, 8, "Video lesson 8", "V", 3],
    [33, 9, "Video lesson 9", "V", 7],
    [33, 10, "Video lesson 10", "V", 2],
    [33, 11, "Video lesson 11", "V", 8],
    [33, 12, "Video lesson 12", "V", 18],
    [33, 13, "Video lesson 13", "V", 4],
    [33, 14, "Video lesson 14", "V", 7],
    [33, 15, "Notes", "P", 0],
  ] },
  { topic: "hld-foundations", title: "Design patterns for scalable systems", kind: "concept", lectures: [
    [46, 1, "Live lesson 1", "L", 0],
    [46, 2, "Notes", "P", 0],
  ] },
  { topic: "hld-foundations", title: "Networking for system design (optional)", kind: "concept", lectures: [
    [88, 1, "Video lesson 1", "V", 6],
    [88, 2, "Video lesson 2", "V", 9],
    [88, 3, "Video lesson 3", "V", 21],
    [88, 4, "Video lesson 4", "V", 10],
    [88, 5, "Video lesson 5", "V", 16],
    [88, 6, "Video lesson 6", "V", 5],
    [88, 7, "Video lesson 7", "V", 8],
    [88, 8, "Video lesson 8", "V", 16],
    [88, 9, "Video lesson 9", "V", 6],
    [88, 10, "Video lesson 10", "V", 21],
    [88, 11, "Video lesson 11", "V", 9],
    [88, 12, "Video lesson 12", "V", 16],
    [88, 13, "Video lesson 13", "V", 5],
    [88, 14, "Video lesson 14", "V", 27],
    [88, 15, "Video lesson 15", "V", 19],
    [88, 16, "Video lesson 16", "V", 10],
    [88, 17, "Video lesson 17", "V", 11],
    [88, 18, "Video lesson 18", "V", 18],
    [88, 19, "Video lesson 19", "V", 17],
    [88, 20, "Video lesson 20", "V", 10],
    [88, 21, "Video lesson 21", "V", 18],
    [88, 22, "Video lesson 22", "V", 11],
    [88, 23, "Video lesson 23", "V", 7],
    [88, 24, "Video lesson 24", "V", 9],
  ] },
  { topic: "hld-foundations", title: "FastAPI crash course (optional)", kind: "concept", lectures: [
    [89, 1, "Video lesson 1", "V", 128],
  ] },
  { topic: "hld-framework", title: "Important numbers for estimation", kind: "concept", aliases: ["Back-of-envelope capacity estimation"], lectures: [
    [41, 1, "Live lesson 1", "L", 0],
    [41, 2, "PDF lesson 1", "P", 0],
  ] },
  { topic: "hld-databases", title: "DBMS basics", kind: "concept", lectures: [
    [31, 1, "Video lesson 1", "V", 45],
    [31, 2, "Video lesson 2", "V", 30],
    [31, 3, "Video lesson 3", "V", 36],
    [31, 4, "Video lesson 4", "V", 45],
    [31, 5, "Video lesson 5", "V", 26],
    [31, 6, "Video lesson 6", "V", 4],
    [31, 7, "Video lesson 7", "V", 2],
    [31, 8, "Video lesson 8", "V", 31],
    [31, 9, "Video lesson 9", "V", 9],
    [31, 10, "Video lesson 10", "V", 10],
    [31, 11, "Video lesson 11", "V", 3],
    [31, 12, "Video lesson 12", "V", 3],
    [31, 13, "Video lesson 13", "V", 21],
    [31, 14, "Video lesson 14", "V", 6],
    [31, 15, "Video lesson 15", "V", 1],
    [31, 16, "Video lesson 16", "V", 4],
    [31, 17, "Video lesson 17", "V", 5],
    [31, 18, "Video lesson 18", "V", 0],
    [31, 19, "Video lesson 19", "V", 9],
    [31, 20, "Video lesson 20", "V", 8],
    [31, 21, "Video lesson 21", "V", 1],
    [31, 22, "Video lesson 22", "V", 13],
    [31, 23, "Video lesson 23", "V", 1],
    [31, 24, "Notes 1", "P", 0],
    [31, 25, "Notes 2", "P", 0],
    [31, 26, "Notes 3", "P", 0],
  ] },
  { topic: "hld-databases", title: "Databases for scale", kind: "concept", lectures: [
    [34, 1, "Video lesson 1", "V", 13],
    [34, 2, "Video lesson 2", "V", 2],
    [34, 3, "Video lesson 3", "V", 2],
    [34, 4, "Video lesson 4", "V", 9],
    [34, 5, "Video lesson 5", "V", 4],
    [34, 6, "Video lesson 6", "V", 9],
    [34, 7, "Video lesson 7", "V", 4],
    [34, 8, "Video lesson 8", "V", 2],
    [34, 9, "Video lesson 9", "V", 11],
    [34, 10, "Video lesson 10", "V", 3],
    [34, 11, "Video lesson 11", "V", 6],
    [34, 12, "Video lesson 12", "V", 10],
    [34, 13, "Video lesson 13", "V", 9],
    [34, 14, "Video lesson 14", "V", 2],
    [34, 15, "Video lesson 14 Part 2 | Sync and Async Replication", "V", 14],
    [34, 16, "Video lesson 15", "V", 11],
    [34, 17, "Video lesson 16", "V", 10],
    [34, 18, "Video lesson 17", "V", 1],
    [34, 19, "Video lesson 18", "V", 24],
    [34, 20, "Video lesson 19", "V", 9],
    [34, 21, "Video lesson 20", "V", 7],
    [34, 22, "Video lesson 21", "V", 2],
    [34, 23, "Video lesson 22", "V", 6],
    [34, 24, "Video lesson 23", "V", 16],
    [34, 25, "Video lesson 24", "V", 8],
    [34, 26, "Video lesson 25", "V", 5],
    [34, 27, "Video lesson 26", "V", 7],
    [34, 28, "Video lesson 27", "V", 2],
  ] },
  { topic: "hld-databases", title: "Transactions & isolation levels", kind: "concept", lectures: [
    [35, 1, "What db to Choose", "V", 26],
    [35, 2, "Intro to transactions", "V", 4],
    [35, 3, "Commits", "V", 2],
    [35, 4, "Demo transaction in SQL", "V", 31],
    [35, 5, "ACID", "V", 9],
    [35, 6, "Isolation levels", "V", 10],
    [35, 7, "Isolation levels 2", "V", 3],
    [35, 8, "Isolation levels", "V", 72],
    [35, 9, "PDF lesson 1", "P", 0],
  ] },
  { topic: "hld-databases", title: "LSM trees: build your own database", kind: "concept", lectures: [
    [54, 1, "Notes", "P", 0],
    [54, 2, "Video lesson 1", "V", 0],
  ] },
  { topic: "hld-databases", title: "Cassandra deep dive", kind: "concept", lectures: [
    [69, 1, "Video lesson 1", "V", 108],
    [69, 2, "Notes", "P", 0],
  ] },
  { topic: "hld-databases", title: "Time-series databases (InfluxDB)", kind: "concept", lectures: [
    [72, 1, "Video lesson 1", "V", 47],
    [72, 2, "Video lesson 2", "V", 37],
    [72, 3, "Notes 1", "P", 0],
    [72, 4, "Notes 2", "P", 0],
  ] },
  { topic: "hld-databases", title: "Change Data Capture (Debezium)", kind: "concept", lectures: [
    [77, 1, "Video lesson 1", "V", 74],
    [77, 2, "PDF lesson 1", "P", 0],
  ] },
  { topic: "hld-databases", title: "DB design practice: Booking.com & Quora/Twitter", kind: "design", difficulty: "medium", lectures: [
    [78, 1, "Video lesson 1", "V", 132],
    [78, 2, "Notes 1", "P", 0],
    [78, 3, "Video lesson 2", "V", 120],
    [78, 4, "Notes 2", "P", 0],
  ] },
  { topic: "hld-caching", title: "Redis features (optional)", kind: "concept", lectures: [
    [90, 1, "Notes", "P", 0],
  ] },
  { topic: "hld-load-balancing", title: "Load balancers with Nginx", kind: "concept", lectures: [
    [38, 1, "Video lesson 1", "V", 16],
    [38, 2, "Video lesson 2", "V", 5],
    [38, 3, "Video lesson 3", "V", 11],
    [38, 4, "PDF lesson 1", "P", 0],
    [38, 5, "Video lesson 4", "V", 19],
  ] },
  { topic: "hld-messaging", title: "Async communication & Kafka", kind: "concept", aliases: ["Kafka fundamentals"], lectures: [
    [39, 1, "Design async systems", "V", 60],
    [39, 2, "Design leetcode", "V", 66],
    [39, 3, "Kafka 1", "V", 72],
    [39, 4, "Kafka 2", "V", 39],
    [39, 5, "Notes", "P", 0],
  ] },
  { topic: "hld-consistency", title: "Distributed systems: Two Generals & Byzantine", kind: "concept", lectures: [
    [40, 1, "Introduction to Distributed system | 2 General problem", "V", 11],
    [40, 2, "The Byzantine generals problem", "V", 9],
    [40, 3, "Notes", "P", 0],
  ] },
  { topic: "hld-consistency", title: "Consistency models: CAP, PACELC & PIE", kind: "concept", aliases: ["CAP & PACELC"], lectures: [
    [50, 1, "Video lesson 1", "V", 19],
    [50, 2, "Video lesson 2", "V", 22],
    [50, 3, "Video lesson 3", "V", 9],
    [50, 4, "Video lesson 4", "V", 5],
    [50, 5, "Video lesson 5", "V", 10],
    [50, 6, "Video lesson 6", "V", 35],
    [50, 7, "Video lesson 7", "V", 9],
    [50, 8, "Notes", "P", 0],
  ] },
  { topic: "hld-consistency", title: "Revising consistency models", kind: "concept", lectures: [
    [66, 1, "Strong consistency", "V", 4],
    [66, 2, "Eventual Consistency", "V", 5],
    [66, 3, "Causal Consistency", "V", 2],
    [66, 4, "Read your write consistency", "V", 2],
    [66, 5, "Monotonic Read Consistency", "V", 3],
    [66, 6, "Tunable consistency - Quorums", "V", 2],
    [66, 7, "Notes", "P", 0],
  ] },
  { topic: "hld-designs-1", title: "URL Shortener", kind: "design", difficulty: "easy", lectures: [
    [42, 1, "Live lesson 1", "L", 0],
    [42, 2, "Notes", "P", 0],
    [48, 1, "Requirement Analysis | Functional", "A", 0],
    [48, 2, "Understanding Non Functional Requirements | LIVE", "T", 0],
    [48, 3, "Understanding back of the envelope calculation | LIVE", "T", 0],
    [48, 4, "Details on Non functional & Envelope Calculation", "P", 0],
    [48, 5, "Understanding API Development | LIVE", "T", 0],
    [48, 6, "Understanding algorithm implementation for URL shortener | LIVE", "T", 0],
    [48, 7, "Logic for Shortener", "P", 0],
    [48, 8, "Deep dive and enhancements", "P", 0],
    [48, 9, "API Design", "P", 0],
    [48, 10, "Understanding DB design and considerations | LIVE", "T", 0],
    [48, 11, "Understanding sharding for DB", "P", 0],
    [48, 12, "Final High level design", "P", 0],
    [48, 13, "Summary", "P", 0],
  ] },
  { topic: "hld-designs-1", title: "Rate Limiter", kind: "design", difficulty: "medium", lectures: [
    [81, 1, "Video lesson 1", "V", 85],
  ] },
  { topic: "hld-designs-1", title: "Notification Service", kind: "design", difficulty: "medium", lectures: [
    [84, 1, "Notes", "P", 0],
    [84, 2, "Video lesson 1", "V", 115],
  ] },
  { topic: "hld-designs-1", title: "Distributed Key-Value Store", kind: "design", difficulty: "hard", lectures: [
    [51, 1, "Video lesson 1", "V", 4],
    [51, 2, "Video lesson 2", "V", 28],
    [51, 3, "Video lesson 3", "V", 17],
    [51, 4, "Video lesson 4", "V", 1],
    [51, 5, "Notes", "P", 0],
  ] },
  { topic: "hld-designs-2", title: "Chat System", kind: "design", difficulty: "medium", aliases: ["WhatsApp"], lectures: [
    [76, 1, "Notes", "P", 0],
    [76, 2, "Live lesson 1", "L", 0],
  ] },
  { topic: "hld-designs-2", title: "News Feed", kind: "design", difficulty: "medium", lectures: [
    [49, 1, "Lecture", "L", 0],
    [49, 2, "Notes", "P", 0],
    [49, 3, "Lecture 2", "L", 0],
    [49, 4, "Notes", "P", 0],
  ] },
  { topic: "hld-designs-2", title: "Hotel Reservation System", kind: "design", difficulty: "medium", lectures: [
    [45, 1, "Live Session 1", "L", 0],
    [45, 2, "Live Session 2", "L", 0],
    [45, 3, "Notes", "P", 0],
  ] },
  { topic: "hld-designs-2", title: "Web Crawler", kind: "design", difficulty: "medium", lectures: [
    [71, 1, "Live lesson 1", "L", 0],
    [71, 2, "PDF lesson 1", "P", 0],
  ] },
  { topic: "hld-designs-2", title: "Google Search", kind: "design", difficulty: "hard", lectures: [
    [47, 1, "Video lesson 1", "V", 8],
    [47, 2, "Video lesson 2", "V", 6],
    [47, 3, "Video lesson 3", "V", 10],
    [47, 4, "Video lesson 4", "V", 8],
    [47, 5, "Video lesson 5", "V", 17],
    [47, 6, "Video lesson 6", "V", 7],
    [47, 7, "Notes", "P", 0],
  ] },
  { topic: "hld-designs-2", title: "Dropbox / Google Drive", kind: "design", difficulty: "medium", lectures: [
    [74, 1, "Live lesson 1", "L", 0],
    [74, 2, "Notes", "P", 0],
  ] },
  { topic: "hld-designs-2", title: "Online auction system", kind: "design", difficulty: "medium", lectures: [
    [70, 1, "Video lesson 1", "V", 130],
    [70, 2, "notes", "P", 0],
    [70, 3, "More refs", "A", 0],
  ] },
  { topic: "hld-designs-2", title: "Tinder (assignment)", kind: "design", difficulty: "medium", lectures: [
    [52, 1, "Assignment", "P", 0],
  ] },
  { topic: "hld-designs-2", title: "Yelp (assignment)", kind: "design", difficulty: "medium", lectures: [
    [53, 1, "Assignment", "P", 0],
  ] },
  { topic: "hld-designs-3", title: "Video Streaming Platform", kind: "design", difficulty: "hard", aliases: ["Netflix"], lectures: [
    [75, 1, "Video lesson 1", "V", 13],
    [75, 2, "Video lesson 2", "V", 25],
    [75, 3, "Video lesson 3", "V", 4],
    [75, 4, "Video lesson 4", "V", 7],
    [75, 5, "Video lesson 5", "V", 20],
    [75, 6, "Video lesson 6", "V", 3],
    [75, 7, "Video lesson 7", "V", 9],
    [75, 8, "Video lesson 8", "V", 3],
    [75, 9, "Notes", "P", 0],
  ] },
  { topic: "hld-designs-3", title: "Ride Sharing", kind: "design", difficulty: "hard", aliases: ["Uber"], lectures: [
    [43, 1, "Part 1", "V", 58],
    [43, 2, "Notes", "P", 0],
    [43, 3, "Notes 2", "P", 0],
    [43, 4, "Part 2", "L", 0],
    [43, 5, "Notes", "P", 0],
  ] },
  { topic: "hld-designs-3", title: "Distributed Job Scheduler", kind: "design", difficulty: "hard", lectures: [
    [44, 1, "Notes", "P", 0],
    [44, 2, "Video lesson 1", "V", 0],
  ] },
  { topic: "hld-designs-3", title: "Collaborative docs (Google Docs)", kind: "design", difficulty: "hard", lectures: [
    [68, 1, "Understanding storage idea about google docs", "V", 64],
    [68, 2, "How YJS CRDT works", "V", 100],
    [68, 3, "Notes", "P", 0],
  ] },
  { topic: "hld-designs-3", title: "Stock exchange: multicast & MMAP", kind: "design", difficulty: "hard", lectures: [
    [73, 1, "Video lesson 1", "V", 100],
    [73, 2, "Extra questions on the design", "P", 0],
  ] },
  { topic: "hld-designs-3", title: "Stock broker (Zerodha) mock interview", kind: "design", difficulty: "hard", lectures: [
    [82, 1, "Notes", "P", 0],
    [82, 2, "Designing stock broker - Mock interview style", "V", 52],
  ] },
  { topic: "hld-designs-3", title: "Ad click platform", kind: "design", difficulty: "hard", lectures: [
    [83, 1, "Live lesson 1", "L", 0],
    [83, 2, "Notes 1", "P", 0],
    [83, 3, "Functional Requirement Details", "P", 0],
    [83, 4, "Non Functional Requirement Details", "P", 0],
    [83, 5, "Noes 2", "P", 0],
    [83, 6, "API Design", "P", 0],
    [83, 7, "Live Lesson 2", "V", 83],
    [83, 8, "Notes 2", "P", 0],
  ] },
  { topic: "hld-designs-3", title: "Google Meet (assignment)", kind: "design", difficulty: "hard", lectures: [
    [85, 1, "Basics of Webrtc", "V", 0],
    [85, 2, "STUN and Signalling", "V", 0],
    [85, 3, "Assignment", "P", 0],
  ] },
  { topic: "hld-cloud", title: "AWS part 1: EC2, IAM, VPC", kind: "concept", lectures: [
    [36, 1, "Introduction to cloud computing", "V", 17],
    [36, 2, "Global infrastructure of AWS", "V", 35],
    [36, 3, "Intro to AWS EC2", "V", 17],
    [36, 4, "Provisioning an EC2 instance", "V", 11],
    [36, 5, "Connecting to an EC2 instance", "V", 8],
    [36, 6, "Ec2 continues", "V", 17],
    [36, 7, "Deploying a node app on Ec2", "V", 25],
    [36, 8, "Intro to AWS IAM", "V", 20],
    [36, 9, "Policy creation in AWS", "V", 17],
    [36, 10, "Article lesson 1", "A", 0],
    [36, 11, "AWS VPC", "V", 61],
  ] },
  { topic: "hld-cloud", title: "AWS part 2", kind: "concept", lectures: [
    [37, 1, "Video lesson 0", "V", 16],
    [37, 2, "Video lesson 1", "V", 12],
    [37, 3, "Video lesson 2", "V", 16],
    [37, 4, "Video lesson 3", "V", 9],
    [37, 5, "Video lesson 4", "V", 3],
    [37, 6, "Video lesson 5", "V", 84],
  ] },
  { topic: "hld-cloud", title: "DynamoDB, Redshift, Kinesis & Glue", kind: "concept", lectures: [
    [80, 1, "Intro to data warehouse and lakes", "V", 9],
    [80, 2, "What is AWS Redshift ?", "V", 10],
    [80, 3, "Redshift architecture", "V", 19],
    [80, 4, "Redshift distribution strategy", "V", 12],
    [80, 5, "Redshift replication", "V", 9],
    [80, 6, "Creating new S3 bucket", "V", 16],
    [80, 7, "Setting up redshift cluster", "V", 22],
    [80, 8, "What is AWS kinesis", "V", 14],
    [80, 9, "Architecture of kinesis", "V", 14],
    [80, 10, "Producers in kinesis", "V", 23],
    [80, 11, "Creating kinesis streams", "V", 8],
    [80, 12, "Producing and consuming data in kinesis", "V", 11],
    [80, 13, "Enhanced fan out", "V", 13],
    [80, 14, "Scaling kinesis", "V", 7],
    [80, 15, "Introduction to AWS GLUE", "V", 14],
    [80, 16, "What is AWS Glue data catalog", "V", 5],
    [80, 17, "ETL Features in AWS GLUE", "V", 11],
    [80, 18, "Introduction to amazon dynamodb", "V", 12],
    [80, 19, "What is partition key, sort key and primary key in dynamodb", "V", 6],
    [80, 20, "Hands on dynamoDB", "V", 8],
    [80, 21, "Uses of dynamodb", "V", 2],
    [80, 22, "Capacity modes in dynamodb", "V", 20],
    [80, 23, "Practical for capacity modes", "V", 4],
    [80, 24, "Indexes in dynamodb", "V", 5],
    [80, 25, "DynamoDB DAX", "V", 13],
    [80, 26, "TTL in dynamoDB", "V", 4],
  ] },
  { topic: "hld-cloud", title: "Infra scripts (optional)", kind: "concept", lectures: [
    [91, 1, "Script to monitor a directory", "V", 11],
    [91, 2, "Checking if website is up", "V", 32],
    [91, 3, "Video lesson 4", "V", 8],
    [91, 4, "Counting files", "V", 20],
    [91, 5, "Fun python script", "V", 6],
    [91, 6, "Disk usage", "V", 4],
  ] },
  { topic: "hld-distributed", title: "Lamport clocks", kind: "concept", lectures: [
    [55, 1, "Live lesson 1", "L", 0],
    [55, 2, "Notes", "P", 0],
  ] },
  { topic: "hld-distributed", title: "Vector clocks & CRDTs", kind: "concept", lectures: [
    [56, 1, "Lesson", "V", 137],
    [56, 2, "Notes", "P", 0],
  ] },
  { topic: "hld-distributed", title: "Google Spanner & TrueTime", kind: "concept", lectures: [
    [57, 1, "Video lesson 1", "V", 43],
    [57, 2, "Notes", "P", 0],
  ] },
  { topic: "hld-distributed", title: "Consensus basics", kind: "concept", aliases: ["Leader election & consensus basics"], lectures: [
    [58, 1, "Introduction to consensus algorithms", "V", 4],
    [58, 2, "Problem of leader election in cron & master slave", "V", 8],
    [58, 3, "Where else leaders are required", "V", 1],
    [58, 4, "Schema change in distributed DB", "V", 6],
    [58, 5, "Membership list in cluster of nodes", "V", 4],
    [58, 6, "Distributed locks", "V", 3],
    [58, 7, "Usage of consensus in databases", "V", 2],
    [58, 8, "Technical definition of consensus algorithms", "V", 5],
    [58, 9, "Notes", "P", 0],
  ] },
  { topic: "hld-distributed", title: "RAFT", kind: "concept", lectures: [
    [59, 1, "An example of a db write with consensus", "V", 14],
    [59, 2, "Understanding the example better", "V", 4],
    [59, 3, "Introduction to RAFT algorithm", "V", 9],
    [59, 4, "Understanding leader election in RAFT", "V", 6],
    [59, 5, "Use of randomized timeout in RAFT", "V", 4],
    [59, 6, "Leadership turbulence and Leadership stickiness", "V", 4],
    [59, 7, "Log replication in RAFT", "V", 12],
    [59, 8, "What if the leader crashes ?", "V", 2],
    [59, 9, "What happens to committed data of a died leader", "V", 2],
    [59, 10, "What happens when a node come backs to life", "V", 4],
    [59, 11, "Consensus algorithm", "P", 0],
    [59, 12, "Schema migration with RAFT", "P", 0],
  ] },
  { topic: "hld-distributed", title: "Paxos", kind: "concept", lectures: [
    [60, 1, "introduction to Paxos algorithm", "V", 20],
    [60, 2, "Understanding an example of paxos", "V", 2],
    [60, 3, "What happens in simultaneous requests in Paxos", "V", 4],
    [60, 4, "How a lost proposer gets the new value", "V", 1],
    [60, 5, "What happens if a node comes back live", "V", 1],
    [60, 6, "Where is raft and paxos used", "V", 12],
    [60, 7, "Notes", "P", 0],
  ] },
  { topic: "hld-distributed", title: "ZippyDB case study", kind: "concept", lectures: [
    [61, 1, "Introduction to the KV store", "V", 1],
    [61, 2, "Understanding basic features of the KV store", "V", 2],
    [61, 3, "Why this KV store was built ?", "V", 3],
    [61, 4, "Core features of the KV store", "V", 2],
    [61, 5, "Write amplification problem part 1", "V", 10],
    [61, 6, "Write amplification problem part 2", "V", 21],
    [61, 7, "How this KV store solves write amplification", "V", 8],
    [61, 8, "Diff between P shard and Micro shard", "V", 10],
    [61, 9, "Why to have a micro shard ?", "V", 3],
    [61, 10, "Data locality service & replication usage of micro shard", "V", 9],
    [61, 11, "Replication and Transaction Support", "V", 17],
    [61, 12, "Fault tolerance ideas", "V", 2],
    [61, 13, "How is Multi tenancy handled", "V", 10],
    [61, 14, "Notes", "P", 0],
    [61, 15, "More references to read", "P", 0],
  ] },
  { topic: "hld-dist-txn", title: "Distributed transactions", kind: "concept", lectures: [
    [63, 1, "Distributed wallet example", "V", 42],
  ] },
  { topic: "hld-dist-txn", title: "Two-phase commit (2PC)", kind: "concept", lectures: [
    [64, 1, "2PC algorithm in detail", "V", 38],
    [64, 2, "Notes", "P", 0],
  ] },
  { topic: "hld-dist-txn", title: "Saga & CQRS", kind: "concept", lectures: [
    [65, 1, "Orchestration saga", "V", 40],
    [65, 2, "Choreography Saga", "V", 28],
    [65, 3, "CQRS", "V", 26],
    [65, 4, "Notes 1", "P", 0],
    [65, 5, "Notes 2", "P", 0],
    [65, 6, "Notes 3", "P", 0],
  ] },
  { topic: "hld-bigdata", title: "Hadoop, HDFS & data lakes", kind: "concept", lectures: [
    [79, 1, "Hadoop", "V", 81],
    [79, 2, "HDFS", "V", 77],
    [79, 3, "Data lakes", "V", 62],
  ] },
  { topic: "hld-bigdata", title: "Elasticsearch internals", kind: "concept", lectures: [
    [67, 1, "Video lesson 1", "V", 56],
    [67, 2, "Notes", "P", 0],
  ] },
  { topic: "hld-bigdata", title: "Heavy hitters: count-min sketch", kind: "concept", lectures: [
    [62, 1, "Notes", "P", 0],
    [62, 2, "Video lesson 1", "V", 66],
  ] },
  { topic: "lld-solid", title: "Intro to design principles", kind: "concept", lectures: [
    [2, 1, "What is a design principle ?", "V", 3],
  ] },
  { topic: "lld-solid", title: "Single Responsibility", kind: "concept", lectures: [
    [3, 1, "Basics of SOLID principles", "V", 22],
    [3, 2, "Identifying lack of single responsibility principle", "V", 15],
    [3, 3, "Concept of monster class", "V", 6],
    [3, 4, "Is there any problem with this class ?", "V", 2],
    [3, 5, "Making the code SRP compatible", "V", 13],
    [3, 6, "SRP is also possible in a frontend code base", "V", 8],
    [3, 7, "New day, New Code, New Problem", "V", 3],
    [3, 8, "Looks like SRP is not always enough", "V", 5],
  ] },
  { topic: "lld-solid", title: "Open/Closed", kind: "concept", lectures: [
    [3, 9, "Introduction to OCP - Open closed principle", "V", 6],
    [3, 10, "How to check if your code is following OCP", "V", 3],
    [3, 11, "Quick note", "V", 6],
    [3, 12, "SRP and OCP", "P", 0],
  ] },
  { topic: "lld-solid", title: "Liskov Substitution", kind: "concept", lectures: [
    [3, 13, "Thinking about a chess piece", "V", 7],
    [3, 14, "Problematic Chess piece class", "V", 7],
    [3, 15, "Improving the chess piece and identifying a new problem", "V", 5],
    [3, 16, "LSP - Liskov substitution principle", "V", 20],
  ] },
  { topic: "lld-solid", title: "Interface Segregation", kind: "concept", lectures: [
    [3, 17, "Introducing ISP - Interface segregation principle", "V", 18],
    [3, 18, "problem of code duplication", "V", 8],
    [3, 20, "LSP & ISP & Strategy Pattern", "P", 0],
  ] },
  { topic: "lld-solid", title: "Dependency Inversion", kind: "concept", lectures: [
    [4, 1, "Understanding code duplicity problem", "V", 35],
    [4, 2, "basics of DIP", "V", 9],
    [4, 3, "Understanding DIP through Repository pattern", "V", 11],
    [4, 4, "DI", "V", 10],
    [4, 5, "Notes", "P", 0],
  ] },
  { topic: "lld-creational", title: "Prototype", kind: "concept", lectures: [
    [6, 1, "A new problem statement", "V", 20],
    [6, 2, "Understanding the solution", "V", 9],
    [6, 3, "Formal platform", "V", 10],
    [6, 4, "Naive Solution", "V", 8],
    [6, 5, "What SOLID principles are violated in the naive solution ?", "V", 3],
    [6, 6, "Another naive Solution", "V", 12],
    [6, 7, "How can we improve ?", "V", 5],
    [6, 8, "Quick note", "V", 1],
    [6, 9, "Idea of a clone method", "V", 3],
    [6, 10, "This is prototype pattern", "V", 10],
    [6, 11, "Good part about the pattern", "V", 1],
    [6, 12, "Notes", "P", 0],
    [6, 13, "Is prototype pattern just a clone?", "V", 3],
  ] },
  { topic: "lld-creational", title: "Builder", kind: "concept", lectures: [
    [7, 1, "Video lesson 1", "V", 3],
    [7, 2, "Video lesson 2", "V", 7],
    [7, 3, "Video lesson 3", "V", 2],
    [7, 4, "Video lesson 4", "V", 7],
    [7, 5, "Video lesson 5", "V", 3],
    [7, 6, "Video lesson 6", "V", 6],
    [7, 7, "Video lesson 7", "V", 8],
    [7, 8, "Video lesson 8", "V", 8],
    [7, 9, "Video lesson 9", "V", 9],
    [7, 10, "Notes", "P", 0],
    [7, 11, "Assignment", "P", 0],
  ] },
  { topic: "lld-creational", title: "Factory Method", kind: "concept", lectures: [
    [10, 1, "Factory", "V", 61],
    [10, 2, "Notes 1", "P", 0],
  ] },
  { topic: "lld-structural", title: "Adapter", kind: "concept", lectures: [
    [10, 3, "Adapter design pattern", "V", 39],
    [10, 4, "Notes 2", "P", 0],
  ] },
  { topic: "lld-structural", title: "Criteria / Filter pattern: e-commerce", kind: "concept", lectures: [
    [17, 1, "Video lesson 1", "V", 4],
    [17, 2, "Video lesson 2", "V", 9],
    [17, 3, "Video lesson 3", "V", 1],
    [17, 4, "Video lesson 4", "V", 4],
    [17, 5, "Video lesson 5", "V", 19],
    [17, 6, "Video lesson 6", "V", 4],
    [17, 7, "Video lesson 7", "V", 7],
    [17, 8, "Notes", "P", 0],
  ] },
  { topic: "lld-behavioral", title: "Strategy", kind: "concept", lectures: [
    [3, 19, "Sneak peek into your first design pattern - Strategy", "V", 11],
  ] },
  { topic: "lld-behavioral", title: "Observer", kind: "concept", lectures: [
    [14, 1, "Live 1", "L", 0],
    [14, 2, "Implementing Observer pattern", "V", 9],
    [14, 3, "Implementing Observer Pattern 2", "V", 7],
    [14, 4, "Implementing Observer Pattern 3", "V", 18],
    [14, 5, "Implementing Observer Pattern 4", "V", 12],
    [14, 6, "Implementing Observer Pattern 5", "V", 1],
    [14, 7, "Implementing Observer Pattern 6", "V", 8],
    [14, 8, "Implementing Observer Pattern 7", "V", 1],
    [14, 9, "Notes", "P", 0],
  ] },
  { topic: "lld-behavioral", title: "Command", kind: "concept", lectures: [
    [22, 1, "Lesson 1", "V", 26],
    [22, 2, "Video lesson 2", "V", 29],
  ] },
  { topic: "lld-behavioral", title: "Chain of Responsibility", kind: "concept", lectures: [
    [12, 1, "Designing a route handler", "V", 13],
    [12, 2, "Requirement analysis", "V", 25],
    [12, 3, "Coding request handler", "V", 23],
    [12, 4, "Exploring middlewares", "V", 2],
    [12, 5, "Quick info", "V", 1],
    [12, 6, "Scope of improvement", "V", 2],
    [12, 7, "Notes", "P", 0],
  ] },
  { topic: "lld-behavioral", title: "Iterator & Repository patterns", kind: "concept", lectures: [
    [9, 1, "The famous problem asked in Coinbase interviews", "V", 14],
    [9, 2, "Exploring repository pattern", "V", 11],
    [9, 3, "DAO layer", "V", 1],
    [9, 4, "Implementing a simple repository", "V", 4],
    [9, 5, "Can you spot an issue ?", "V", 1],
    [9, 6, "Iterator design pattern", "V", 20],
    [9, 7, "Examples of iterators", "V", 6],
    [9, 8, "Notes", "P", 0],
  ] },
  { topic: "lld-quality", title: "Unit testing & test doubles", kind: "concept", lectures: [
    [87, 1, "Video lesson 1", "V", 94],
  ] },
  { topic: "lld-mc-1", title: "How to approach machine coding", kind: "concept", lectures: [
    [8, 1, "Live lesson 1", "L", 0],
    [8, 2, "Notes", "P", 0],
  ] },
  { topic: "lld-mc-1", title: "Rule engine (Rippling)", kind: "machine-coding", difficulty: "medium", lectures: [
    [5, 1, "Live lesson 1", "L", 0],
    [5, 2, "Live lesson 2", "L", 0],
    [5, 3, "Class Notes", "P", 0],
  ] },
  { topic: "lld-mc-1", title: "ATM machine (State pattern)", kind: "machine-coding", difficulty: "medium", lectures: [
    [11, 1, "Requirements of an ATM machine", "V", 7],
    [11, 2, "Flow of ATM machine", "V", 5],
    [11, 3, "A very naive solution", "V", 7],
    [11, 4, "States of ATM", "V", 7],
    [11, 5, "Why just storing state as enum is not enough", "V", 5],
    [11, 6, "Problem with ATM Class", "V", 6],
    [11, 7, "Problems with ATM class", "V", 4],
    [11, 8, "Problem with our solution", "V", 3],
    [11, 9, "Solving violation of DIP", "V", 2],
    [11, 10, "Introduction to state design pattern", "V", 2],
    [11, 11, "Coding state interface", "V", 10],
    [11, 12, "Implementing a state class", "V", 1],
    [11, 13, "Implementing a ready state", "V", 16],
    [11, 14, "Video lesson 16", "V", 5],
    [11, 15, "ATM models", "V", 16],
    [11, 16, "Card manager service layer", "V", 13],
    [11, 17, "Coding States logic 0", "V", 1],
    [11, 18, "Coding States logic 1", "V", 8],
    [11, 19, "Coding States logic 2", "V", 4],
    [11, 20, "Coding Dispense Cash", "V", 23],
    [11, 21, "Coding the Eject card", "V", 1],
    [11, 22, "How can you improve it ?", "V", 3],
    [11, 23, "Notes", "P", 0],
  ] },
  { topic: "lld-mc-1", title: "LRU & LFU cache", kind: "machine-coding", difficulty: "medium", lectures: [
    [13, 1, "PDF lesson 1", "P", 0],
  ] },
  { topic: "lld-mc-1", title: "Parking Lot", kind: "machine-coding", difficulty: "medium", lectures: [
    [15, 1, "Video lesson 1", "V", 13],
    [15, 2, "Video lesson 2", "V", 6],
    [15, 3, "Video lesson 3", "V", 7],
    [15, 4, "Video lesson 4", "V", 0],
    [15, 5, "Video lesson 5", "V", 3],
    [15, 6, "Video lesson 6", "V", 6],
    [15, 7, "Video lesson 7", "V", 8],
    [15, 8, "Video lesson 8", "V", 2],
    [15, 9, "Video lesson 9", "V", 4],
    [15, 10, "Video lesson 10", "V", 9],
    [15, 11, "Video lesson 11", "V", 4],
    [15, 12, "Video lesson 12", "V", 0],
    [15, 13, "Video lesson 13", "V", 4],
    [15, 14, "Video lesson 14", "V", 2],
    [15, 15, "Video lesson 15", "V", 13],
    [15, 16, "Video lesson 16", "V", 13],
    [15, 17, "Video lesson 17", "V", 12],
    [15, 18, "Video lesson 18", "V", 2],
    [15, 19, "Video lesson 19", "V", 9],
    [15, 20, "Video lesson 20", "V", 7],
    [15, 21, "Notes 1", "P", 0],
    [15, 22, "Notes 2", "P", 0],
  ] },
  { topic: "lld-mc-1", title: "Tic-Tac-Toe", kind: "machine-coding", difficulty: "easy", lectures: [
    [18, 1, "Problem Statement", "P", 0],
  ] },
  { topic: "lld-mc-1", title: "Logger", kind: "machine-coding", difficulty: "medium", lectures: [
    [29, 1, "Assignment", "P", 0],
    [29, 2, "Solution", "P", 0],
    [29, 3, "Minor Enhancements", "P", 0],
  ] },
  { topic: "lld-mc-1", title: "Coinbase interview practice", kind: "machine-coding", difficulty: "medium", lectures: [
    [24, 1, "Assignment", "P", 0],
  ] },
  { topic: "lld-mc-2", title: "Movie Ticket Booking", kind: "machine-coding", difficulty: "hard", aliases: ["BookMyShow"], lectures: [
    [16, 1, "Video lesson 1", "V", 5],
    [16, 2, "Video lesson 2", "V", 11],
    [16, 3, "Video lesson 3", "V", 10],
    [16, 4, "Video lesson 4", "V", 1],
    [16, 5, "Video lesson 5", "V", 8],
    [16, 6, "Video lesson 6", "V", 2],
    [16, 7, "Video lesson 7", "V", 3],
    [16, 8, "Video lesson 8", "V", 1],
    [16, 9, "Video lesson 9", "V", 4],
    [16, 10, "Video lesson 10", "V", 12],
    [16, 11, "Video lesson 11", "V", 6],
    [16, 12, "Video lesson 12", "V", 9],
    [16, 13, "Video lesson 13", "V", 7],
    [16, 14, "Video lesson 14", "V", 4],
    [16, 15, "Video lesson 15", "V", 13],
    [16, 16, "Video lesson 16", "V", 8],
    [16, 17, "Video lesson 17", "V", 6],
    [16, 18, "Video lesson 18", "V", 2],
    [16, 19, "Video lesson 19", "V", 9],
    [16, 20, "Video lesson 20", "V", 10],
    [16, 21, "Video lesson 21", "V", 8],
    [16, 22, "Video lesson 22", "V", 5],
    [16, 23, "Video lesson 23", "V", 21],
    [16, 24, "Video lesson 24", "V", 7],
    [16, 25, "Video lesson 25", "V", 4],
    [16, 26, "Video lesson 26", "V", 21],
    [16, 27, "Video lesson 27", "V", 14],
    [16, 28, "Video lesson 28", "V", 3],
    [16, 29, "Notes", "P", 0],
  ] },
  { topic: "lld-mc-2", title: "Splitwise", kind: "machine-coding", difficulty: "medium", lectures: [
    [25, 1, "Video lesson 1", "V", 11],
    [25, 2, "Video lesson 2", "V", 13],
    [25, 3, "Video lesson 3", "V", 10],
    [25, 4, "Video lesson 4", "V", 7],
    [25, 5, "Video lesson 5", "V", 7],
    [25, 6, "Video lesson 6", "V", 6],
    [25, 7, "Video lesson 7", "V", 7],
    [25, 8, "PDF lesson 1", "P", 0],
  ] },
  { topic: "lld-mc-2", title: "Chess", kind: "machine-coding", difficulty: "hard", lectures: [
    [23, 1, "Video lesson 1", "V", 3],
    [23, 2, "Video lesson 2", "V", 8],
    [23, 3, "Video lesson 3", "V", 10],
    [23, 4, "Video lesson 4", "V", 2],
    [23, 5, "Video lesson 5", "V", 5],
    [23, 6, "Video lesson 6", "V", 8],
    [23, 7, "Video lesson 7", "V", 1],
    [23, 8, "Video lesson 8", "V", 6],
    [23, 9, "Video lesson 9", "V", 14],
    [23, 10, "Video lesson 10", "V", 14],
    [23, 11, "Video lesson 11", "V", 4],
    [23, 12, "Video lesson 12", "V", 12],
    [23, 13, "Video lesson 13", "V", 32],
    [23, 14, "Video lesson 14", "V", 13],
    [23, 15, "Video lesson 15", "V", 3],
    [23, 16, "Video lesson 16", "V", 9],
    [23, 17, "Video lesson 17", "V", 5],
    [23, 18, "Video lesson 18", "V", 5],
    [23, 19, "Video lesson 19", "V", 2],
    [23, 20, "Video lesson 20", "V", 4],
    [23, 21, "Video lesson 21", "V", 6],
    [23, 22, "Video lesson 22", "V", 17],
    [23, 23, "Video lesson 23", "V", 2],
    [23, 24, "Video lesson 24", "V", 11],
    [23, 25, "Video lesson 25", "V", 6],
    [23, 26, "Video lesson 26", "V", 15],
    [23, 27, "Notes", "P", 0],
  ] },
  { topic: "lld-mc-2", title: "Stock broker", kind: "machine-coding", difficulty: "hard", lectures: [
    [20, 1, "Live lesson 1", "L", 0],
    [20, 2, "Notes", "P", 0],
  ] },
  { topic: "lld-mc-2", title: "Stock exchange (Spring Boot)", kind: "machine-coding", difficulty: "hard", lectures: [
    [21, 1, "Live lesson 1", "L", 0],
    [21, 2, "Live lesson 2", "L", 0],
    [21, 3, "Live lesson 3", "L", 0],
    [21, 4, "Live lesson 4", "L", 0],
    [21, 5, "Live lesson 5", "L", 0],
    [21, 6, "Notes", "P", 0],
  ] },
  { topic: "lld-mc-2", title: "Cap table generator", kind: "machine-coding", difficulty: "medium", lectures: [
    [26, 1, "PDF lesson 1", "P", 0],
  ] },
  { topic: "lld-mc-2", title: "Interview practice problems", kind: "machine-coding", difficulty: "medium", lectures: [
    [19, 1, "Problem 1", "P", 0],
    [19, 2, "Problem 2", "P", 0],
    [19, 3, "Problem 3", "P", 0],
    [19, 4, "Problem 4", "P", 0],
    [19, 5, "Problem 5", "P", 0],
  ] },
  { topic: "lld-concurrency", title: "Concurrency & threads", kind: "concept", lectures: [
    [27, 1, "Video lesson 1", "V", 7],
    [27, 2, "Video lesson 2", "V", 2],
    [27, 3, "Video lesson 3", "V", 8],
    [27, 4, "Video lesson 4", "V", 14],
    [27, 5, "Video lesson 5", "V", 12],
    [27, 6, "Video lesson 6", "V", 2],
    [27, 7, "Video lesson 7", "V", 6],
    [27, 8, "Video lesson 8", "V", 4],
    [27, 9, "Video lesson 9", "V", 5],
    [27, 10, "Notes", "P", 0],
  ] },
  { topic: "lld-concurrency", title: "Understanding locks", kind: "concept", lectures: [
    [28, 1, "Live lesson 1", "L", 0],
    [28, 2, "Notes", "P", 0],
  ] },
  { topic: "lld-concurrency", title: "Concurrent programming (optional)", kind: "concept", lectures: [
    [86, 1, "Basics of context switching and thread", "V", 120],
    [86, 2, "Video lesson 2", "V", 7],
    [86, 3, "Video lesson 3", "V", 2],
    [86, 4, "Video lesson 4", "V", 8],
    [86, 5, "Video lesson 5", "V", 6],
    [86, 6, "Video lesson 6", "V", 4],
    [86, 7, "Video lesson 7", "V", 5],
    [86, 8, "Video lesson 8", "V", 14],
    [86, 9, "Video lesson 9", "V", 12],
    [86, 10, "Video lesson 11", "V", 2],
    [86, 11, "PDF lesson 1", "P", 0],
  ] },
];

const KIND_WORD: Record<LectureType, string> = { V: 'video', L: 'live session', P: 'PDF', A: 'article', T: 'exercise' };

/** The steps for one lecture (the rule is in the header comment). */
export function stepsFor([sec, n, title, type, min]: Lecture): SubItem[] {
  const id = `ac${sec}.${n}`;
  const name = `${sec}.${n} ${title}`;
  const step = (suffix: string, label: string): SubItem => ({ id: id + suffix, title: `${name} · ${label}`, done: false });
  if (type === 'V') {
    const chunks = min > 0 ? Math.ceil(min / 10) : 1;
    const watch = Array.from({ length: chunks }, (_, k) =>
      step(`w${k + 1}`, min > 0 ? `watch ${k * 10}–${Math.min(min, (k + 1) * 10)} min` : 'watch'),
    );
    return [...watch, step('n', 'notes (10 min)')];
  }
  if (type === 'L') return [step('w1', 'watch live session'), step('n', 'notes (10 min)')];
  return [step('r', type === 'T' ? 'do the exercise' : `read ${KIND_WORD[type]}`)];
}

const BUFFER: SubItem[] = [1, 2, 3].map((k) => ({ id: `acb${k}`, title: `Buffer ${k} · extra research`, done: false }));

function cardSteps(card: Card): SubItem[] {
  return [...card.lectures.flatMap(stepsFor), ...BUFFER];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Adds the course to a journey. Topics and cards you already have (same name in the same
 * tree) are kept and only gain the steps they are missing; nothing is removed, reset or
 * moved. Safe to run more than once.
 */
export function mergeAlgoCamp(topics: Topic[], items: PracticeItem[], now: string): { topics: Topic[]; items: PracticeItem[] } {
  // Topics: reuse one with the same id or the same name in the same tree.
  const topicIds = new Map<string, string>();
  const nextTopics = [...topics];
  for (const t of ALGOCAMP_TOPICS) {
    const have = topics.find((x) => x.id === t.id || (x.domain === t.domain && norm(x.name) === norm(t.name)));
    if (have) topicIds.set(t.id, have.id);
    else {
      topicIds.set(t.id, t.id);
      nextTopics.push({ ...t, target: CARDS.filter((c) => c.topic === t.id).length });
    }
  }
  const known = new Set(nextTopics.map((t) => t.id));
  const nextItems = [...items];
  for (const card of CARDS) {
    const domain = card.topic.split('-')[0] as Domain;
    const topicId = topicIds.get(card.topic) ?? card.topic;
    if (!known.has(topicId)) continue; // a tree topic you deleted stays deleted
    const names = new Set([card.title, ...(card.aliases ?? [])].map(norm));
    const at = nextItems.findIndex((i) => i.domain === domain && names.has(norm(i.title)));
    const steps = cardSteps(card);
    if (at === -1) {
      nextItems.push(
        makeItem(
          { id: `${domain}:ac-${slug(card.title)}`, domain, topicId, kind: card.kind, title: card.title, difficulty: card.difficulty, tags: [ALGOCAMP_TAG], subItems: steps, custom: true },
          now,
        ),
      );
      continue;
    }
    const it = nextItems[at];
    const have = new Set((it.subItems ?? []).map((s) => s.id));
    const add = steps.filter((s) => !have.has(s.id));
    if (!add.length) continue;
    nextItems[at] = {
      ...it,
      subItems: [...(it.subItems ?? []), ...add],
      tags: it.tags.includes(ALGOCAMP_TAG) ? it.tags : [...it.tags, ALGOCAMP_TAG],
      updatedAt: now,
    };
  }
  return { topics: nextTopics, items: nextItems };
}
