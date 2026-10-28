import type { Difficulty, Domain, ItemKind, ItemStatus, PracticeItem, Topic } from './types';
import { slug } from '../lib/id';

/** Default curriculum. Topics + starter items (all "not started"). Not sample data. */

export const DOMAIN_META: Record<Domain, { label: string; short: string; title: string; tagline: string }> = {
  dsa: { label: 'DSA', short: 'DSA', title: 'Algorithmic Mastery', tagline: 'Java, patterns, problems and speed' },
  hld: { label: 'System Design', short: 'HLD', title: 'System Design', tagline: 'Scale, trade-offs and clarity' },
  lld: { label: 'Low-Level Design', short: 'LLD', title: 'Low-Level Design', tagline: 'Objects, patterns and clean code' },
};

export const RUBRICS: Record<'design' | 'machine-coding', { key: string; label: string }[]> = {
  design: [
    { key: 'requirements', label: 'Requirements gathered (functional + non-functional)' },
    { key: 'estimation', label: 'Capacity estimation' },
    { key: 'api', label: 'API design' },
    { key: 'dataModel', label: 'Data model & storage choice' },
    { key: 'architecture', label: 'High-level architecture & components' },
    { key: 'scaling', label: 'Scalability (caching, sharding, queues)' },
    { key: 'reliability', label: 'Reliability & consistency' },
    { key: 'tradeoffs', label: 'Trade-offs articulated' },
    { key: 'explain', label: 'Explained end-to-end without notes' },
  ],
  'machine-coding': [
    { key: 'requirements', label: 'Requirements & scope clarified' },
    { key: 'entities', label: 'Object model & entities' },
    { key: 'uml', label: 'Class diagram & relationships' },
    { key: 'interfaces', label: 'Interfaces / abstractions defined' },
    { key: 'patterns', label: 'Appropriate design patterns applied' },
    { key: 'solid', label: 'SOLID principles respected' },
    { key: 'implemented', label: 'Working implementation' },
    { key: 'tests', label: 'Tests / testable seams' },
    { key: 'extensible', label: 'Extension scenario handled' },
  ],
};

export const STATUS_LABELS: Record<ItemKind, Record<ItemStatus, string>> = {
  problem: {
    'not-started': 'Not started',
    attempted: 'Attempted',
    unsolved: 'Unsolved',
    'with-hints': 'Solved with hints',
    independent: 'Solved independently',
  },
  concept: {
    'not-started': 'Not started',
    attempted: 'Studying',
    unsolved: 'Unclear',
    'with-hints': 'Understood with notes',
    independent: 'Can explain independently',
  },
  design: {
    'not-started': 'Not started',
    attempted: 'In progress',
    unsolved: 'Stuck',
    'with-hints': 'Done with reference',
    independent: 'Designed independently',
  },
  'machine-coding': {
    'not-started': 'Not started',
    attempted: 'In progress',
    unsolved: 'Stuck',
    'with-hints': 'Built with reference',
    independent: 'Built independently',
  },
};

export const KIND_LABELS: Record<ItemKind, string> = {
  problem: 'Problem',
  concept: 'Concept',
  design: 'Design exercise',
  'machine-coding': 'Machine coding',
};

type TopicSeed = [id: string, name: string, tier: number, prereqs: string[], description: string];

const DSA_TOPICS: TopicSeed[] = [
  ['arrays', 'Arrays', 0, [], 'Traversal, prefix sums, in-place updates'],
  ['strings', 'Strings', 0, [], 'Manipulation, parsing, palindromes'],
  ['hashing', 'Hashing', 0, [], 'Maps, sets, frequency counting'],
  ['two-pointers', 'Two Pointers', 1, ['arrays'], 'Converging and fast/slow pointers'],
  ['sliding-window', 'Sliding Window', 1, ['strings', 'hashing'], 'Fixed and variable windows'],
  ['binary-search', 'Binary Search', 1, ['arrays'], 'Search space reduction, answer search'],
  ['recursion', 'Recursion', 1, ['arrays'], 'Base cases, call stack, divide & conquer'],
  ['linked-lists', 'Linked Lists', 1, ['arrays'], 'Pointer manipulation, cycles'],
  ['stacks-queues', 'Stacks & Queues', 1, ['arrays'], 'Monotonic stacks, BFS queues'],
  ['sorting', 'Sorting', 2, ['recursion'], 'Comparators, merge/quick sort, counting'],
  ['backtracking', 'Backtracking', 2, ['recursion'], 'Subsets, permutations, pruning'],
  ['trees', 'Trees', 2, ['recursion', 'linked-lists'], 'DFS/BFS, BSTs, LCA'],
  ['heaps', 'Heaps', 3, ['trees'], 'Top-K, two heaps, scheduling'],
  ['tries', 'Tries', 3, ['trees', 'strings'], 'Prefix search, word dictionaries'],
  ['graphs', 'Graphs', 3, ['trees', 'stacks-queues'], 'BFS/DFS, topological sort, union-find'],
  ['greedy', 'Greedy', 3, ['sorting'], 'Exchange arguments, local choices'],
  ['intervals', 'Intervals', 3, ['sorting'], 'Merging, sweeping, meeting rooms'],
  ['dp', 'Dynamic Programming', 4, ['recursion', 'backtracking'], '1D/2D DP, knapsack, LIS, strings'],
  ['advanced-graphs', 'Advanced Graphs', 4, ['graphs', 'heaps'], 'Dijkstra, MST, Bellman-Ford'],
  ['bits', 'Bit Manipulation', 2, ['arrays'], 'XOR tricks, masks'],
  ['math', 'Math & Geometry', 2, ['arrays'], 'Matrices, number theory'],
];

const DSA_PROBLEMS: Record<string, [string, Difficulty][]> = {
  arrays: [['Best Time to Buy and Sell Stock', 'easy'], ['Product of Array Except Self', 'medium'], ['Maximum Subarray', 'medium'], ['Rotate Array', 'medium']],
  strings: [['Valid Palindrome', 'easy'], ['Longest Common Prefix', 'easy'], ['String Compression', 'medium']],
  hashing: [['Two Sum', 'easy'], ['Group Anagrams', 'medium'], ['Longest Consecutive Sequence', 'medium'], ['Top K Frequent Elements', 'medium']],
  'two-pointers': [['3Sum', 'medium'], ['Container With Most Water', 'medium'], ['Trapping Rain Water', 'hard']],
  'sliding-window': [['Longest Substring Without Repeating Characters', 'medium'], ['Permutation in String', 'medium'], ['Minimum Window Substring', 'hard']],
  'binary-search': [['Binary Search', 'easy'], ['Search in Rotated Sorted Array', 'medium'], ['Koko Eating Bananas', 'medium'], ['Median of Two Sorted Arrays', 'hard']],
  recursion: [['Climbing Stairs', 'easy'], ['Pow(x, n)', 'medium'], ['Generate Parentheses', 'medium']],
  'linked-lists': [['Reverse Linked List', 'easy'], ['Linked List Cycle', 'easy'], ['LRU Cache', 'medium'], ['Merge k Sorted Lists', 'hard']],
  'stacks-queues': [['Valid Parentheses', 'easy'], ['Min Stack', 'medium'], ['Daily Temperatures', 'medium'], ['Largest Rectangle in Histogram', 'hard']],
  sorting: [['Sort Colors', 'medium'], ['Sort an Array', 'medium'], ['Largest Number', 'medium']],
  backtracking: [['Subsets', 'medium'], ['Permutations', 'medium'], ['Combination Sum', 'medium'], ['N-Queens', 'hard']],
  trees: [['Maximum Depth of Binary Tree', 'easy'], ['Invert Binary Tree', 'easy'], ['Binary Tree Level Order Traversal', 'medium'], ['Validate Binary Search Tree', 'medium'], ['Lowest Common Ancestor of a BST', 'medium'], ['Binary Tree Maximum Path Sum', 'hard']],
  heaps: [['Kth Largest Element in an Array', 'medium'], ['K Closest Points to Origin', 'medium'], ['Find Median from Data Stream', 'hard']],
  tries: [['Implement Trie (Prefix Tree)', 'medium'], ['Design Add and Search Words Data Structure', 'medium'], ['Word Search II', 'hard']],
  graphs: [['Number of Islands', 'medium'], ['Clone Graph', 'medium'], ['Course Schedule', 'medium'], ['Rotting Oranges', 'medium'], ['Pacific Atlantic Water Flow', 'medium']],
  greedy: [['Jump Game', 'medium'], ['Gas Station', 'medium'], ['Partition Labels', 'medium']],
  intervals: [['Merge Intervals', 'medium'], ['Insert Interval', 'medium'], ['Non-overlapping Intervals', 'medium'], ['Meeting Rooms II', 'medium']],
  dp: [['House Robber', 'medium'], ['Coin Change', 'medium'], ['Longest Increasing Subsequence', 'medium'], ['Longest Common Subsequence', 'medium'], ['Edit Distance', 'medium'], ['Burst Balloons', 'hard']],
  'advanced-graphs': [['Network Delay Time', 'medium'], ['Min Cost to Connect All Points', 'medium'], ['Cheapest Flights Within K Stops', 'medium'], ['Alien Dictionary', 'hard']],
  bits: [['Single Number', 'easy'], ['Counting Bits', 'easy'], ['Sum of Two Integers', 'medium']],
  math: [['Happy Number', 'easy'], ['Rotate Image', 'medium'], ['Spiral Matrix', 'medium']],
};

const HLD_TOPICS: TopicSeed[] = [
  ['foundations', 'Foundations', 0, [], 'Networking basics, latency, APIs'],
  ['framework', 'Interview Framework', 0, [], 'How to run a design interview end-to-end'],
  ['databases', 'Databases & Storage', 1, ['foundations'], 'SQL/NoSQL, indexing, replication, sharding'],
  ['caching', 'Caching', 1, ['foundations'], 'Strategies, eviction, invalidation'],
  ['load-balancing', 'Load Balancing & Networking', 1, ['foundations'], 'L4/L7, consistent hashing, proxies'],
  ['messaging', 'Queues & Async Processing', 2, ['databases'], 'Queues, pub/sub, delivery semantics'],
  ['consistency', 'Consistency & Reliability', 2, ['databases', 'caching'], 'CAP, consensus, failover, rate limiting'],
  ['designs-1', 'Classic Designs I', 2, ['framework', 'caching'], 'Foundational interview designs'],
  ['designs-2', 'Classic Designs II', 3, ['designs-1', 'messaging'], 'Stateful, real-time and booking systems'],
  ['designs-3', 'Advanced Designs', 4, ['designs-2', 'consistency'], 'Large-scale, multi-region systems'],
];

const HLD_ITEMS: Record<string, [string, ItemKind, Difficulty?][]> = {
  foundations: [['Client–server model & HTTP', 'concept'], ['DNS & CDNs', 'concept'], ['Latency vs throughput', 'concept'], ['REST vs gRPC vs GraphQL', 'concept']],
  framework: [['Requirements gathering', 'concept'], ['Back-of-envelope capacity estimation', 'concept'], ['API & data model design', 'concept'], ['Deep dives & trade-off discussion', 'concept']],
  databases: [['SQL vs NoSQL', 'concept'], ['Indexing', 'concept'], ['Replication', 'concept'], ['Sharding & partitioning', 'concept'], ['Transactions & isolation levels', 'concept']],
  caching: [['Cache-aside, write-through, write-back', 'concept'], ['Eviction policies (LRU/LFU)', 'concept'], ['Cache invalidation & stampedes', 'concept']],
  'load-balancing': [['L4 vs L7 load balancing', 'concept'], ['Consistent hashing', 'concept'], ['Reverse proxies & API gateways', 'concept']],
  messaging: [['Message queues vs pub/sub', 'concept'], ['Kafka fundamentals', 'concept'], ['Delivery semantics & idempotency', 'concept']],
  consistency: [['CAP & PACELC', 'concept'], ['Leader election & consensus basics', 'concept'], ['Rate limiting algorithms', 'concept'], ['Circuit breakers, retries & backoff', 'concept']],
  'designs-1': [['URL Shortener', 'design', 'easy'], ['Rate Limiter', 'design', 'medium'], ['Notification Service', 'design', 'medium'], ['Distributed Key-Value Store', 'design', 'hard']],
  'designs-2': [['Chat System', 'design', 'medium'], ['News Feed', 'design', 'medium'], ['Hotel Reservation System', 'design', 'medium'], ['Web Crawler', 'design', 'medium'], ['Search Autocomplete', 'design', 'medium']],
  'designs-3': [['Video Streaming Platform', 'design', 'hard'], ['Ride Sharing', 'design', 'hard'], ['Distributed Job Scheduler', 'design', 'hard'], ['Payment System', 'design', 'hard']],
};

/**
 * Java, from scratch to interview-ready. Lives in the DSA workspace as its own
 * track, chained only to itself so existing DSA topics never lock behind it.
 */
export const JAVA_TRACK = 'java';

const JAVA_TOPICS: TopicSeed[] = [
  ['java-basics', 'Java Basics', 0, [], 'Syntax, types, control flow, methods'],
  ['java-oop', 'OOP in Java', 1, ['java-basics'], 'Classes, inheritance, interfaces'],
  ['java-core', 'Core Java', 1, ['java-basics'], 'Exceptions, wrappers, enums, records'],
  ['java-collections', 'Collections Framework', 2, ['java-oop'], 'List, Set, Map, Deque, PriorityQueue'],
  ['java-generics', 'Generics', 2, ['java-oop'], 'Type parameters, wildcards, erasure'],
  ['java-for-dsa', 'Java for DSA', 2, ['java-collections'], 'Picking structures, templates, pitfalls'],
  ['java-functional', 'Functional Java', 3, ['java-collections', 'java-generics'], 'Lambdas, streams, Optional'],
  ['java-jvm', 'JVM & Memory', 3, ['java-core'], 'Heap vs stack, GC, string pool'],
  ['java-concurrency', 'Concurrency', 4, ['java-functional', 'java-jvm'], 'Threads, executors, concurrent collections'],
];

const JAVA_ITEMS: Record<string, string[]> = {
  'java-basics': [
    'JDK setup and your first program',
    'Variables and primitive types',
    'Operators and type casting',
    'Control flow: if, switch, loops',
    'Methods, parameters and return values',
    'Arrays and 2D arrays',
    'String and StringBuilder',
    'Reading input and printing output',
  ],
  'java-oop': [
    'Classes, objects and constructors',
    'this, static and final',
    'Inheritance and super',
    'Method overriding and polymorphism',
    'Abstract classes vs interfaces',
    'Access modifiers and packages',
    'equals, hashCode and toString',
  ],
  'java-core': [
    'Exceptions: checked vs unchecked',
    'try-catch-finally and try-with-resources',
    'Wrapper classes and autoboxing',
    'Enums',
    'Records and immutability',
  ],
  'java-collections': [
    'ArrayList vs LinkedList',
    'HashSet, LinkedHashSet and TreeSet',
    'HashMap, LinkedHashMap and TreeMap',
    'How HashMap works internally',
    'ArrayDeque as stack and queue',
    'PriorityQueue',
    'Comparable and Comparator',
    'Iterators and ConcurrentModificationException',
  ],
  'java-generics': ['Generic classes and methods', 'Bounded types and wildcards', 'Type erasure'],
  'java-for-dsa': [
    'Choosing the right collection for a problem',
    'Fast input/output for practice',
    'Integer overflow, == vs equals and other pitfalls',
    'Recursion depth and stack overflow',
  ],
  'java-functional': ['Lambdas and functional interfaces', 'Streams: map, filter, collect', 'Optional', 'Method references'],
  'java-jvm': ['JDK, JRE and JVM', 'Stack vs heap memory', 'Garbage collection basics', 'String pool and immutability'],
  'java-concurrency': [
    'Threads and Runnable',
    'synchronized, volatile and the memory model',
    'ExecutorService and thread pools',
    'ConcurrentHashMap and atomic variables',
    'CompletableFuture',
  ],
};

/** The Java track's topics and concept items, ready to add to any journey. */
export function javaTrack(now: string): { topics: Topic[]; items: PracticeItem[] } {
  const ts = topics('dsa', JAVA_TOPICS, (id) => Math.max(3, JAVA_ITEMS[id]?.length ?? 3)).map((t) => ({ ...t, track: JAVA_TRACK }));
  const items: PracticeItem[] = [];
  for (const [t, list] of Object.entries(JAVA_ITEMS)) {
    for (const title of list) items.push(makeItem({ id: `dsa:java-${slug(title)}`, domain: 'dsa', topicId: `dsa-${t}`, kind: 'concept', title }, now));
  }
  return { topics: ts, items };
}

const LLD_TOPICS: TopicSeed[] = [
  ['oop', 'OOP Fundamentals', 0, [], 'Encapsulation, abstraction, polymorphism'],
  ['uml', 'UML & Relationships', 0, [], 'Class diagrams, associations, sequence diagrams'],
  ['solid', 'SOLID Principles', 1, ['oop'], 'Five principles of maintainable design'],
  ['creational', 'Creational Patterns', 1, ['oop'], 'Controlling object creation'],
  ['structural', 'Structural Patterns', 2, ['solid', 'creational'], 'Composing objects and interfaces'],
  ['behavioral', 'Behavioral Patterns', 2, ['solid'], 'Communication between objects'],
  ['quality', 'Code Quality & Testability', 2, ['solid'], 'DI, testing, concurrency safety'],
  ['mc-1', 'Machine Coding I', 3, ['uml', 'behavioral'], 'Classic object-modeling exercises'],
  ['mc-2', 'Machine Coding II', 4, ['mc-1', 'structural', 'quality'], 'Stateful, concurrent systems'],
];

const LLD_ITEMS: Record<string, [string, ItemKind, Difficulty?][]> = {
  oop: [['Encapsulation & information hiding', 'concept'], ['Inheritance vs composition', 'concept'], ['Polymorphism', 'concept'], ['Interfaces vs abstract classes', 'concept']],
  uml: [['Class diagrams', 'concept'], ['Association, aggregation, composition', 'concept'], ['Sequence diagrams', 'concept']],
  solid: [['Single Responsibility', 'concept'], ['Open/Closed', 'concept'], ['Liskov Substitution', 'concept'], ['Interface Segregation', 'concept'], ['Dependency Inversion', 'concept']],
  creational: [['Singleton', 'concept'], ['Factory Method', 'concept'], ['Abstract Factory', 'concept'], ['Builder', 'concept']],
  structural: [['Adapter', 'concept'], ['Decorator', 'concept'], ['Facade', 'concept'], ['Composite', 'concept'], ['Proxy', 'concept']],
  behavioral: [['Strategy', 'concept'], ['Observer', 'concept'], ['Command', 'concept'], ['State', 'concept'], ['Chain of Responsibility', 'concept']],
  quality: [['Dependency injection', 'concept'], ['Unit testing & test doubles', 'concept'], ['Thread safety basics', 'concept']],
  'mc-1': [['Parking Lot', 'machine-coding', 'medium'], ['Library Management System', 'machine-coding', 'easy'], ['Tic-Tac-Toe', 'machine-coding', 'easy'], ['Vending Machine', 'machine-coding', 'medium']],
  'mc-2': [['Elevator System', 'machine-coding', 'hard'], ['Splitwise', 'machine-coding', 'medium'], ['Movie Ticket Booking', 'machine-coding', 'hard'], ['In-memory Rate Limiter', 'machine-coding', 'medium']],
};

/** Pattern-category items count as "patterns" for achievements. */
export const PATTERN_TOPICS = ['creational', 'structural', 'behavioral'];

export function emptyReview() {
  return { stage: -1, successCount: 0, lapseCount: 0, history: [] };
}

export function makeItem(
  partial: Pick<PracticeItem, 'domain' | 'topicId' | 'kind' | 'title'> & Partial<PracticeItem>,
  now: string,
): PracticeItem {
  return {
    id: partial.id ?? `${partial.domain}:${slug(partial.title)}`,
    status: 'not-started',
    confidence: 0,
    timeSpentMin: 0,
    hintsUsed: false,
    notes: '',
    tags: [],
    rubric: {},
    review: emptyReview(),
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

function topics(domain: Domain, seeds: TopicSeed[], targetFor: (id: string) => number): Topic[] {
  return seeds.map(([id, name, tier, prereqs, description]) => ({
    id: `${domain}-${id}`,
    domain,
    name,
    tier,
    prerequisites: prereqs.map((p) => `${domain}-${p}`),
    target: targetFor(id),
    description,
  }));
}

/**
 * A real journey starts without DSA and System Design items — you add your own.
 * LLD keeps its starters; sample mode uses every domain's starters.
 */
export const REAL_STARTER_DOMAINS: Domain[] = ['lld'];

export function buildCatalog(now: string, starterDomains: Domain[] = ['dsa', 'hld', 'lld']): { topics: Topic[]; items: PracticeItem[] } {
  const ts: Topic[] = [
    ...topics('dsa', DSA_TOPICS, (id) => (['dp', 'graphs', 'trees'].includes(id) ? 8 : 5)),
    ...topics('hld', HLD_TOPICS, (id) => (id.startsWith('designs') ? 3 : 3)),
    ...topics('lld', LLD_TOPICS, (id) => (id.startsWith('mc') ? 3 : 3)),
  ];
  const items: PracticeItem[] = [];
  for (const [t, list] of Object.entries(DSA_PROBLEMS)) {
    for (const [title, difficulty] of list) {
      items.push(makeItem({ domain: 'dsa', topicId: `dsa-${t}`, kind: 'problem', title, difficulty }, now));
    }
  }
  for (const [domain, map] of [['hld', HLD_ITEMS], ['lld', LLD_ITEMS]] as const) {
    for (const [t, list] of Object.entries(map)) {
      for (const [title, kind, difficulty] of list) {
        items.push(makeItem({ domain, topicId: `${domain}-${t}`, kind, title, difficulty }, now));
      }
    }
  }
  // The Java track always comes with its syllabus: it is learned from scratch, item by item.
  const java = javaTrack(now);
  return { topics: [...ts, ...java.topics], items: [...items.filter((i) => starterDomains.includes(i.domain)), ...java.items] };
}
