import type { Difficulty, PracticeItem, SubItem, Topic } from './types';
import { makeItem } from './catalog';
import { slug } from '../lib/id';

/**
 * DSA by pattern, from "DSA patterns Cheat Sheet.xlsx": each pattern is a skill-tree topic and
 * each problem a card with its link. Generated from the sheet; edit the sheet and regenerate
 * rather than editing the lists by hand.
 */

export const DSA_SHEET_TAG = 'dsa-sheet';

interface PatternTopic {
  id: string;
  name: string;
  tier: number;
  prerequisites: string[];
  description: string;
  /** Old topic-wise topics whose cards move here (the topic itself goes). */
  absorbs: string[];
}
interface Card {
  topic: string;
  title: string;
  difficulty?: Difficulty;
  url?: string;
  /** Other links from the sheet (variants, videos), kept in the card's notes. */
  refs?: string[];
  /** One step per problem when a row lists several. */
  steps?: string[];
  tags: string[];
}

/** In the sheet's order. Ids reuse the old topic-wise topics where one matches, so their cards and progress carry over. */
export const DSA_PATTERNS: PatternTopic[] = [
  { id: "dsa-two-pointers", name: "Two Pointers", tier: 0, prerequisites: [], description: "Pairs, triplets, partitioning sorted arrays", absorbs: [] },
  { id: "dsa-fast-slow", name: "Fast & Slow Pointers", tier: 1, prerequisites: ["dsa-two-pointers"], description: "Cycles, middles, linked-list tricks", absorbs: [] },
  { id: "dsa-sliding-window", name: "Sliding Window", tier: 1, prerequisites: ["dsa-two-pointers", "dsa-hashing"], description: "Fixed and variable windows", absorbs: [] },
  { id: "dsa-kadane", name: "Kadane", tier: 1, prerequisites: ["dsa-prefix-sum"], description: "Best subarray ending here", absorbs: [] },
  { id: "dsa-prefix-sum", name: "Prefix Sum", tier: 0, prerequisites: [], description: "Running sums, sums divisible by k, pivots", absorbs: [] },
  { id: "dsa-intervals", name: "Merge Intervals", tier: 1, prerequisites: ["dsa-two-pointers"], description: "Merging, inserting, meeting rooms", absorbs: [] },
  { id: "dsa-linked-lists", name: "In-place Reversal of a LinkedList", tier: 2, prerequisites: ["dsa-fast-slow"], description: "Reversing whole lists, sub-lists and groups", absorbs: [] },
  { id: "dsa-stacks-queues", name: "Stack", tier: 0, prerequisites: [], description: "Matching, monotonic stacks, next greater", absorbs: [] },
  { id: "dsa-hashing", name: "Hash Maps", tier: 0, prerequisites: [], description: "Counting, lookups, frequency", absorbs: [] },
  { id: "dsa-binary-search", name: "Binary Search", tier: 1, prerequisites: ["dsa-two-pointers"], description: "Bounds, rotated arrays, search on the answer", absorbs: [] },
  { id: "dsa-heaps", name: "Heap", tier: 3, prerequisites: ["dsa-trees", "dsa-binary-search"], description: "Top K, K closest, merging, two heaps", absorbs: [] },
  { id: "dsa-recursion", name: "Recursion & Backtracking", tier: 1, prerequisites: ["dsa-stacks-queues"], description: "Base cases, choices, permutations, partitions", absorbs: ["dsa-backtracking"] },
  { id: "dsa-trees", name: "Trees", tier: 2, prerequisites: ["dsa-recursion"], description: "Traversals, symmetry, search, paths, construction", absorbs: [] },
  { id: "dsa-graphs", name: "Graphs", tier: 3, prerequisites: ["dsa-trees"], description: "BFS/DFS, cycles, topo sort, shortest paths, MST", absorbs: ["dsa-advanced-graphs"] },
  { id: "dsa-dp", name: "Dynamic Programming", tier: 4, prerequisites: ["dsa-recursion", "dsa-trees"], description: "Memoisation, tabulation, knapsack, LIS, LCS", absorbs: [] },
  { id: "dsa-greedy", name: "Greedy", tier: 2, prerequisites: ["dsa-intervals"], description: "Local choices that stay optimal", absorbs: [] },
];

// prettier-ignore
const CARDS: Card[] = [
  { topic: "dsa-two-pointers", title: "Pair with Target Sum", difficulty: "easy", url: "https://leetcode.com/problems/two-sum-ii-input-array-is-sorted/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-two-pointers", title: "Rearrange 0 and 1", url: "https://www.geeksforgeeks.org/problems/segregate-0s-and-1s5106/1", tags: ["dsa-sheet"] },
  { topic: "dsa-two-pointers", title: "Remove Duplicates", difficulty: "easy", url: "https://leetcode.com/problems/remove-duplicates-from-sorted-list/", refs: ["https://leetcode.com/problems/remove-duplicates-from-sorted-array/description/", "https://leetcode.com/problems/remove-duplicates-from-sorted-array-ii/"], steps: ["Remove duplicates from sorted list", "Remove duplicates from sorted array", "Remove duplicates from sorted array ii"], tags: ["dsa-sheet"] },
  { topic: "dsa-two-pointers", title: "Squaring a Sorted Array", difficulty: "easy", url: "https://leetcode.com/problems/squares-of-a-sorted-array/", tags: ["dsa-sheet"] },
  { topic: "dsa-two-pointers", title: "Triplet Sum to Zero", difficulty: "medium", url: "https://leetcode.com/problems/3sum/", tags: ["dsa-sheet"] },
  { topic: "dsa-two-pointers", title: "Triplet Sum Close to Target", difficulty: "medium", url: "https://leetcode.com/problems/3sum-closest/", tags: ["dsa-sheet"] },
  { topic: "dsa-two-pointers", title: "Triplets with Smaller Sum", difficulty: "medium", url: "https://www.geeksforgeeks.org/problems/count-triplets-with-sum-smaller-than-x5549/1", tags: ["dsa-sheet"] },
  { topic: "dsa-two-pointers", title: "Subarrays with Product Less than a Target", difficulty: "medium", url: "https://leetcode.com/problems/subarray-product-less-than-k/", tags: ["dsa-sheet"] },
  { topic: "dsa-two-pointers", title: "Dutch National Flag Problem", difficulty: "medium", url: "https://leetcode.com/problems/sort-colors/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-two-pointers", title: "Quadruple Sum to Target", difficulty: "medium", url: "https://leetcode.com/problems/4sum/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-two-pointers", title: "Comparing Strings containing Backspaces", difficulty: "medium", url: "https://leetcode.com/problems/backspace-string-compare/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-two-pointers", title: "Minimum Window Sort", difficulty: "medium", url: "https://leetcode.com/problems/shortest-unsorted-continuous-subarray/", refs: ["https://www.ideserve.co.in/learn/minimum-length-subarray-sorting-which-results-in-sorted-array"], tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-fast-slow", title: "LinkedList Cycle", difficulty: "easy", url: "https://leetcode.com/problems/linked-list-cycle/", tags: ["dsa-sheet"] },
  { topic: "dsa-fast-slow", title: "Start of LinkedList Cycle", difficulty: "medium", url: "https://leetcode.com/problems/linked-list-cycle-ii/", tags: ["dsa-sheet"] },
  { topic: "dsa-fast-slow", title: "Happy Number", difficulty: "medium", url: "https://leetcode.com/problems/happy-number/", tags: ["dsa-sheet"] },
  { topic: "dsa-fast-slow", title: "FIND DUPLICATE NUMBER", url: "https://leetcode.com/problems/find-the-duplicate-number/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-fast-slow", title: "Middle of the LinkedList", difficulty: "easy", url: "https://leetcode.com/problems/middle-of-the-linked-list/", tags: ["dsa-sheet"] },
  { topic: "dsa-fast-slow", title: "Palindrome LinkedList", difficulty: "medium", url: "https://leetcode.com/problems/palindrome-linked-list/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-fast-slow", title: "Rearrange a LinkedList", difficulty: "medium", url: "https://leetcode.com/problems/reorder-list/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-fast-slow", title: "Cycle in a Circular Array", difficulty: "hard", url: "https://leetcode.com/problems/circular-array-loop/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-sliding-window", title: "Maximum Sum Subarray of Size K", difficulty: "easy", url: "https://www.geeksforgeeks.org/problems/max-sum-subarray-of-size-k5313/1", tags: ["dsa-sheet"] },
  { topic: "dsa-sliding-window", title: "Smallest Subarray with a given sum", difficulty: "easy", url: "https://leetcode.com/problems/minimum-size-subarray-sum/", tags: ["dsa-sheet"] },
  { topic: "dsa-sliding-window", title: "Longest Substring with K Distinct Characters", difficulty: "medium", url: "https://www.geeksforgeeks.org/problems/longest-k-unique-characters-substring0853/1", tags: ["dsa-sheet"] },
  { topic: "dsa-sliding-window", title: "Fruits into Baskets", difficulty: "medium", url: "https://leetcode.com/problems/fruit-into-baskets/", tags: ["dsa-sheet"] },
  { topic: "dsa-sliding-window", title: "No-repeat Substring", difficulty: "hard", url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/", tags: ["dsa-sheet"] },
  { topic: "dsa-sliding-window", title: "Longest Substring with Same Letters after Replacement", difficulty: "hard", url: "https://leetcode.com/problems/longest-repeating-character-replacement/", tags: ["dsa-sheet"] },
  { topic: "dsa-sliding-window", title: "Longest Subarray with Ones after Replacement", difficulty: "hard", url: "https://leetcode.com/problems/max-consecutive-ones-iii/", tags: ["dsa-sheet"] },
  { topic: "dsa-sliding-window", title: "MInimum Size Substring", difficulty: "hard", url: "https://leetcode.com/problems/minimum-window-substring/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-sliding-window", title: "Permutation in a String", difficulty: "hard", url: "https://leetcode.com/problems/permutation-in-string/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-sliding-window", title: "String Anagrams", difficulty: "hard", url: "https://leetcode.com/problems/find-all-anagrams-in-a-string/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-sliding-window", title: "Words Concatenation", difficulty: "hard", url: "https://leetcode.com/problems/substring-with-concatenation-of-all-words/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-kadane", title: "Maximum subarray sum", url: "https://leetcode.com/problems/maximum-subarray/", tags: ["dsa-sheet"] },
  { topic: "dsa-kadane", title: "Minimum Subarray Sum", url: "https://www.geeksforgeeks.org/problems/smallest-sum-contiguous-subarray/1", tags: ["dsa-sheet"] },
  { topic: "dsa-kadane", title: "Maximum product subarray", url: "https://leetcode.com/problems/maximum-product-subarray/", tags: ["dsa-sheet"] },
  { topic: "dsa-kadane", title: "Maximum subarray sum with one deletion", url: "https://leetcode.com/problems/maximum-subarray-sum-with-one-deletion/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-kadane", title: "Maximum absolute sum of any subarray", url: "https://leetcode.com/problems/maximum-absolute-sum-of-any-subarray/", tags: ["dsa-sheet"] },
  { topic: "dsa-kadane", title: "Maximum sum in circular array variant", url: "https://leetcode.com/problems/maximum-sum-circular-subarray/", tags: ["dsa-sheet"] },
  { topic: "dsa-prefix-sum", title: "Subarray Sum Equals K", difficulty: "easy", url: "https://leetcode.com/problems/subarray-sum-equals-k/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-prefix-sum", title: "Find Pivot Index", difficulty: "easy", url: "https://leetcode.com/problems/find-pivot-index/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-prefix-sum", title: "Subarray Sums Divisible By K", difficulty: "medium", url: "https://leetcode.com/problems/subarray-sums-divisible-by-k/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-prefix-sum", title: "Contiguous array", difficulty: "medium", url: "https://leetcode.com/problems/contiguous-array/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-prefix-sum", title: "Shortest Subarray With Sum at Least K", difficulty: "hard", url: "https://leetcode.com/problems/shortest-subarray-with-sum-at-least-k/description/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-prefix-sum", title: "Count Range Sum", difficulty: "hard", url: "https://leetcode.com/problems/count-of-range-sum/description/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-intervals", title: "Merge Intervals", difficulty: "medium", url: "https://leetcode.com/problems/merge-intervals/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-intervals", title: "Insert Interval", difficulty: "medium", url: "https://leetcode.com/problems/insert-interval/", tags: ["dsa-sheet"] },
  { topic: "dsa-intervals", title: "Intervals Intersection", difficulty: "medium", url: "https://leetcode.com/problems/interval-list-intersections/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-intervals", title: "Overlapping Intervals", url: "https://www.geeksforgeeks.org/check-if-any-two-intervals-overlap-among-a-given-set-of-intervals/", tags: ["dsa-sheet"] },
  { topic: "dsa-intervals", title: "Minimum Meeting Rooms", difficulty: "hard", url: "https://www.geeksforgeeks.org/problems/attend-all-meetings-ii/1", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-intervals", title: "Maximum CPU Load", difficulty: "hard", url: "https://www.geeksforgeeks.org/maximum-cpu-load-from-the-given-list-of-jobs/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-intervals", title: "Employee Free Time", difficulty: "hard", url: "https://www.codertrain.co/employee-free-time", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-linked-lists", title: "Reverse a LinkedList", difficulty: "easy", url: "https://leetcode.com/problems/reverse-linked-list/", tags: ["dsa-sheet"] },
  { topic: "dsa-linked-lists", title: "Reverse a Sub-list", difficulty: "medium", url: "https://leetcode.com/problems/reverse-linked-list-ii/", tags: ["dsa-sheet"] },
  { topic: "dsa-linked-lists", title: "Reverse List in Pairs", difficulty: "medium", url: "https://leetcode.com/problems/swap-nodes-in-pairs/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-linked-lists", title: "Reverse every K-element Sub-list", difficulty: "hard", url: "https://leetcode.com/problems/reverse-nodes-in-k-group/", tags: ["dsa-sheet"] },
  { topic: "dsa-linked-lists", title: "Reverse nodes in EVEN Length Groups", difficulty: "hard", url: "https://leetcode.com/problems/reverse-nodes-in-even-length-groups/description/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-linked-lists", title: "Rotate a LinkedList", difficulty: "medium", url: "https://leetcode.com/problems/rotate-list/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-stacks-queues", title: "remove adjacent duplicates", url: "https://leetcode.com/problems/remove-all-adjacent-duplicates-in-string/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-stacks-queues", title: "Balanced Parentheses", url: "https://leetcode.com/problems/valid-parentheses/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-stacks-queues", title: "Reverse a String", tags: ["dsa-sheet"] },
  { topic: "dsa-stacks-queues", title: "Next Greater Element", difficulty: "easy", url: "https://leetcode.com/problems/next-greater-element-ii/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-stacks-queues", title: "Daily Temperatures", difficulty: "easy", url: "https://leetcode.com/problems/daily-temperatures/", tags: ["dsa-sheet"] },
  { topic: "dsa-stacks-queues", title: "Remove Nodes From Linked List", difficulty: "easy", url: "https://leetcode.com/problems/remove-nodes-from-linked-list/", tags: ["dsa-sheet"] },
  { topic: "dsa-stacks-queues", title: "Remove All Adjacent Duplicates in String II", difficulty: "medium", url: "https://leetcode.com/problems/remove-all-adjacent-duplicates-in-string-ii/", tags: ["dsa-sheet"] },
  { topic: "dsa-stacks-queues", title: "Simplify Path", url: "https://leetcode.com/problems/simplify-path/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-stacks-queues", title: "Remove K Digits", difficulty: "hard", url: "https://leetcode.com/problems/remove-k-digits/", tags: ["dsa-sheet", "challenge"] },
  { topic: "dsa-hashing", title: "First Non-repeating Character", difficulty: "easy", url: "https://leetcode.com/problems/first-unique-character-in-a-string/", tags: ["dsa-sheet"] },
  { topic: "dsa-hashing", title: "Maximum Number of Balloons", difficulty: "easy", url: "https://leetcode.com/problems/maximum-number-of-balloons/", tags: ["dsa-sheet"] },
  { topic: "dsa-hashing", title: "Longest Palindrome", difficulty: "easy", url: "https://leetcode.com/problems/longest-palindrome/", tags: ["dsa-sheet"] },
  { topic: "dsa-hashing", title: "Ransom Note", difficulty: "easy", url: "https://leetcode.com/problems/ransom-note/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Binary search basic", url: "https://leetcode.com/problems/binary-search/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Upper Bound/ Ceiling", url: "https://www.geeksforgeeks.org/problems/ceil-in-a-sorted-array/1", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "First and Last position", url: "https://leetcode.com/problems/find-first-and-last-position-of-element-in-sorted-array/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Count number of occurences", url: "https://www.geeksforgeeks.org/problems/number-of-occurrence2259/1", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Search in infinite Sorted array", url: "https://www.geeksforgeeks.org/find-position-element-sorted-array-infinite-numbers/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Peak index in Mountain", url: "https://leetcode.com/problems/peak-index-in-a-mountain-array/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Find peak in mountain range", url: "https://leetcode.com/problems/find-peak-element/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Find minimum in rotated sorted array", url: "https://leetcode.com/problems/find-minimum-in-rotated-sorted-array/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Find number of rotations to sorted array", url: "https://www.geeksforgeeks.org/problems/rotation4723/1", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Search in rotated sorted array", url: "https://leetcode.com/problems/search-in-rotated-sorted-array/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "KOKO eating BANANAS", url: "https://leetcode.com/problems/koko-eating-bananas/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Min num of days to make m bouquets", url: "https://leetcode.com/problems/minimum-number-of-days-to-make-m-bouquets/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Aggresive cows", url: "https://www.geeksforgeeks.org/problems/aggressive-cows/1", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "H index 2", url: "https://leetcode.com/problems/h-index-ii/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Max candies to k children", url: "https://leetcode.com/problems/maximum-candies-allocated-to-k-children/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Capacity to ship packages in d days", url: "https://leetcode.com/problems/capacity-to-ship-packages-within-d-days/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Book Allocation Problem", url: "https://www.geeksforgeeks.org/problems/allocate-minimum-number-of-pages0937/1", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Split largest arrray", url: "https://leetcode.com/problems/split-array-largest-sum/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Search 2 D matrix", url: "https://leetcode.com/problems/search-a-2d-matrix/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "Search 2D matrix", difficulty: "hard", url: "https://leetcode.com/problems/search-a-2d-matrix-ii/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "kth smallest in sorted matrix", url: "https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "kth smallest in multiplication matrix", url: "https://leetcode.com/problems/kth-smallest-number-in-multiplication-table/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-binary-search", title: "median of 2 sorted arrays", url: "https://leetcode.com/problems/median-of-two-sorted-arrays/", tags: ["dsa-sheet"] },
  { topic: "dsa-heaps", title: "kth smallest", url: "https://www.geeksforgeeks.org/problems/kth-smallest-element5635/1", tags: ["dsa-sheet", "kth"] },
  { topic: "dsa-heaps", title: "kth largest", url: "https://leetcode.com/problems/kth-largest-element-in-an-array/description/", tags: ["dsa-sheet", "kth"] },
  { topic: "dsa-heaps", title: "TOP K frequent Elements", url: "https://leetcode.com/problems/top-k-frequent-elements/description/", tags: ["dsa-sheet", "kth"] },
  { topic: "dsa-heaps", title: "Top K frequent Words", url: "https://leetcode.com/problems/top-k-frequent-words/description/", tags: ["dsa-sheet", "kth"] },
  { topic: "dsa-heaps", title: "K closest points to origin", url: "https://leetcode.com/problems/k-closest-points-to-origin/description/", tags: ["dsa-sheet", "k-closest"] },
  { topic: "dsa-heaps", title: "Find K closest elements", url: "https://leetcode.com/problems/find-k-closest-elements/description/", tags: ["dsa-sheet", "k-closest"] },
  { topic: "dsa-heaps", title: "Kth weakest row in Matrix", url: "https://leetcode.com/problems/the-k-weakest-rows-in-a-matrix/description/", tags: ["dsa-sheet", "k-closest"] },
  { topic: "dsa-heaps", title: "Merge K Sorted Arrays", url: "https://www.geeksforgeeks.org/problems/merge-k-sorted-arrays/1", tags: ["dsa-sheet", "heap-as-pointer"] },
  { topic: "dsa-heaps", title: "Kth Smallest in Sorted Matrix", url: "https://leetcode.com/problems/kth-smallest-element-in-a-sorted-matrix/description/", tags: ["dsa-sheet", "heap-as-pointer"] },
  { topic: "dsa-heaps", title: "LAST STONE WEIGHT", url: "https://leetcode.com/problems/last-stone-weight/description/", tags: ["dsa-sheet", "greedy-heap"] },
  { topic: "dsa-heaps", title: "CPU Task Scheduler", url: "https://leetcode.com/problems/task-scheduler/description/", tags: ["dsa-sheet", "greedy-heap"] },
  { topic: "dsa-heaps", title: "Reorganize String", url: "https://leetcode.com/problems/reorganize-string/", tags: ["dsa-sheet", "greedy-heap"] },
  { topic: "dsa-heaps", title: "Min number of refueling stops", url: "https://leetcode.com/problems/minimum-number-of-refueling-stops/description/", tags: ["dsa-sheet", "greedy-heap"] },
  { topic: "dsa-heaps", title: "IPO", url: "https://leetcode.com/problems/ipo/description/", tags: ["dsa-sheet", "greedy-heap"] },
  { topic: "dsa-heaps", title: "Course Scheduler 3", url: "https://leetcode.com/problems/course-schedule-iii/description/", tags: ["dsa-sheet", "greedy-heap"] },
  { topic: "dsa-heaps", title: "Find median in data stream", url: "https://leetcode.com/problems/find-median-from-data-stream/description/", tags: ["dsa-sheet", "2-heaps"] },
  { topic: "dsa-heaps", title: "Sliding Window Median", difficulty: "hard", url: "https://leetcode.com/problems/sliding-window-median/description/", tags: ["dsa-sheet", "2-heaps"] },
  { topic: "dsa-recursion", title: "Fibonnaci", url: "https://leetcode.com/problems/fibonacci-number/description/", refs: ["https://www.youtube.com/watch?v=j4wjZqzhMqc&t"], tags: ["dsa-sheet"] },
  { topic: "dsa-recursion", title: "Check if string is Pallindrome", url: "https://www.geeksforgeeks.org/problems/palindrome-string0817/1", refs: ["https://www.youtube.com/watch?v=j4wjZqzhMqc&t"], tags: ["dsa-sheet"] },
  { topic: "dsa-recursion", title: "Check if Array is Sorted", url: "https://www.geeksforgeeks.org/problems/check-if-an-array-is-sorted0701/1", refs: ["https://www.youtube.com/watch?v=-gC-QEdpvO4"], tags: ["dsa-sheet"] },
  { topic: "dsa-recursion", title: "Sum of digits of a number", url: "https://www.geeksforgeeks.org/problems/sum-of-digits1742/1", refs: ["https://www.youtube.com/watch?v=-gC-QEdpvO4"], tags: ["dsa-sheet"] },
  { topic: "dsa-recursion", title: "Remove occurences of a character in string", url: "https://www.geeksforgeeks.org/problems/remove-all-occurrences-of-a-character-in-a-string/1", refs: ["https://www.youtube.com/watch?v=-gC-QEdpvO4"], tags: ["dsa-sheet"] },
  { topic: "dsa-recursion", title: "Generate parenthesis", url: "https://leetcode.com/problems/generate-parentheses/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-recursion", title: "Letter Combinations of phone number", url: "https://leetcode.com/problems/letter-combinations-of-a-phone-number/description/", refs: ["https://www.youtube.com/watch?v=IKfIT6uFOcs"], tags: ["dsa-sheet"] },
  { topic: "dsa-recursion", title: "Permutations", url: "https://leetcode.com/problems/permutations/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-recursion", title: "Combination Sum", url: "https://leetcode.com/problems/combination-sum/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-recursion", title: "Pallindrome partition", url: "https://leetcode.com/problems/palindrome-partitioning/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-trees", title: "Inorder", url: "https://leetcode.com/problems/binary-tree-inorder-traversal/description/", tags: ["dsa-sheet", "traversal"] },
  { topic: "dsa-trees", title: "Preorder", url: "https://leetcode.com/problems/binary-tree-preorder-traversal/description/", tags: ["dsa-sheet", "traversal"] },
  { topic: "dsa-trees", title: "Postorder", url: "https://leetcode.com/problems/binary-tree-postorder-traversal/description/", tags: ["dsa-sheet", "traversal", "homework"] },
  { topic: "dsa-trees", title: "Level Order", url: "https://leetcode.com/problems/binary-tree-level-order-traversal/description/", tags: ["dsa-sheet", "traversal"] },
  { topic: "dsa-trees", title: "ZigZag Order", url: "https://leetcode.com/problems/binary-tree-zigzag-level-order-traversal/description/", tags: ["dsa-sheet", "traversal"] },
  { topic: "dsa-trees", title: "Level Order II", url: "https://leetcode.com/problems/binary-tree-level-order-traversal-ii/description/", tags: ["dsa-sheet", "traversal", "homework"] },
  { topic: "dsa-trees", title: "Invert Tree", url: "https://leetcode.com/problems/invert-binary-tree/description/", tags: ["dsa-sheet", "mirror-and-symmetry"] },
  { topic: "dsa-trees", title: "Symmetric Tree", url: "https://leetcode.com/problems/symmetric-tree/description/", tags: ["dsa-sheet", "mirror-and-symmetry"] },
  { topic: "dsa-trees", title: "Same Tree", url: "https://leetcode.com/problems/same-tree/description/", tags: ["dsa-sheet", "mirror-and-symmetry", "homework"] },
  { topic: "dsa-trees", title: "Subtree of another TREE", url: "https://leetcode.com/problems/subtree-of-another-tree/description/", tags: ["dsa-sheet", "mirror-and-symmetry"] },
  { topic: "dsa-trees", title: "Flip Equivalent Tree", url: "https://leetcode.com/problems/flip-equivalent-binary-trees/description/", tags: ["dsa-sheet", "mirror-and-symmetry"] },
  { topic: "dsa-trees", title: "LCA of Binary TREE", url: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-tree/description/", tags: ["dsa-sheet", "search"] },
  { topic: "dsa-trees", title: "Binary Search Tree", url: "https://leetcode.com/problems/search-in-a-binary-search-tree/", tags: ["dsa-sheet", "search"] },
  { topic: "dsa-trees", title: "LCA of BST", url: "https://leetcode.com/problems/lowest-common-ancestor-of-a-binary-search-tree/description/", tags: ["dsa-sheet", "search"] },
  { topic: "dsa-trees", title: "LCA of Deepest Leaves", url: "https://leetcode.com/problems/lowest-common-ancestor-of-deepest-leaves/description/", tags: ["dsa-sheet", "search"] },
  { topic: "dsa-trees", title: "Two Sum IV", url: "https://leetcode.com/problems/two-sum-iv-input-is-a-bst/description/", tags: ["dsa-sheet", "search"] },
  { topic: "dsa-trees", title: "Kth smallest element in BST", url: "https://leetcode.com/problems/kth-smallest-element-in-a-bst/description/", tags: ["dsa-sheet", "search"] },
  { topic: "dsa-trees", title: "Minimum Depth of Binary Tree", url: "https://leetcode.com/problems/minimum-depth-of-binary-tree/description/", tags: ["dsa-sheet", "validation"] },
  { topic: "dsa-trees", title: "Maximum Depth of Binary Tree", url: "https://leetcode.com/problems/maximum-depth-of-binary-tree/description/", tags: ["dsa-sheet", "validation"] },
  { topic: "dsa-trees", title: "Balanced Binary Tree", url: "https://leetcode.com/problems/balanced-binary-tree/description/", tags: ["dsa-sheet", "validation"] },
  { topic: "dsa-trees", title: "Diameter of Binary Tree", url: "https://leetcode.com/problems/diameter-of-binary-tree/description/", tags: ["dsa-sheet", "validation"] },
  { topic: "dsa-trees", title: "Check Completeness of Binary Tree", url: "https://leetcode.com/problems/check-completeness-of-a-binary-tree/description/", tags: ["dsa-sheet", "validation"] },
  { topic: "dsa-trees", title: "Validate BST", url: "https://leetcode.com/problems/validate-binary-search-tree/description/", tags: ["dsa-sheet", "validation"] },
  { topic: "dsa-trees", title: "Recover BST", url: "https://leetcode.com/problems/recover-binary-search-tree/description/", tags: ["dsa-sheet", "validation"] },
  { topic: "dsa-trees", title: "Path Sum", url: "https://leetcode.com/problems/path-sum/description/", tags: ["dsa-sheet", "path-sum"] },
  { topic: "dsa-trees", title: "Path Sum II", url: "https://leetcode.com/problems/path-sum-ii/", tags: ["dsa-sheet", "path-sum"] },
  { topic: "dsa-trees", title: "Sum of Root to Leaf", url: "https://leetcode.com/problems/sum-root-to-leaf-numbers/description/", tags: ["dsa-sheet", "path-sum"] },
  { topic: "dsa-trees", title: "Maximum Path Sum", url: "https://leetcode.com/problems/binary-tree-maximum-path-sum/description/", tags: ["dsa-sheet", "path-sum"] },
  { topic: "dsa-trees", title: "Contruct tree from preorder and inorder", url: "https://leetcode.com/problems/construct-binary-tree-from-preorder-and-inorder-traversal/description/", tags: ["dsa-sheet", "construction"] },
  { topic: "dsa-trees", title: "Contruct tree from postorder and inorder", url: "https://leetcode.com/problems/construct-binary-tree-from-inorder-and-postorder-traversal/description/", tags: ["dsa-sheet", "construction"] },
  { topic: "dsa-trees", title: "Sorted Array to BST", url: "https://leetcode.com/problems/convert-sorted-array-to-binary-search-tree/description/", tags: ["dsa-sheet", "construction"] },
  { topic: "dsa-graphs", title: "Construct Adjancency List from EDGES+Nodes", url: "https://www.geeksforgeeks.org/problems/print-adjacency-list-1587115620/1", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Graph DFS", url: "https://www.geeksforgeeks.org/problems/depth-first-traversal-for-a-graph/1", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "GRAPH BFS", url: "https://www.geeksforgeeks.org/problems/bfs-traversal-of-graph/1", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Number of Islands", url: "https://leetcode.com/problems/number-of-islands/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Number of Provinces", url: "https://leetcode.com/problems/number-of-provinces/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Rotten Oranges", url: "https://leetcode.com/problems/rotting-oranges/", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Cycle detection in undirected graph", url: "https://www.geeksforgeeks.org/problems/detect-cycle-in-an-undirected-graph/1", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Cycle detection in directed graph", url: "https://www.geeksforgeeks.org/problems/detect-cycle-in-a-directed-graph/1", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Topological sort", url: "https://www.geeksforgeeks.org/problems/topological-sort/1", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Bipartite Graph/ Graph Coloring", url: "https://leetcode.com/problems/is-graph-bipartite/", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Surrounded Regoins", url: "https://leetcode.com/problems/surrounded-regions/", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Shortest Path in Non-Weighted Graph", url: "https://www.geeksforgeeks.org/problems/shortest-path-in-undirected-graph-having-unit-distance/1", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Dijkstra's Algorithm", url: "https://www.geeksforgeeks.org/problems/implementing-dijkstra-set-1-adjacency-matrix/1", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Network Delay", url: "https://leetcode.com/problems/network-delay-time/", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Path With Minimum Effort", url: "https://leetcode.com/problems/path-with-minimum-effort/", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Swim in Rising Water", url: "https://leetcode.com/problems/swim-in-rising-water/", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Bellman ford", url: "https://www.geeksforgeeks.org/problems/distance-from-the-source-bellman-ford-algorithm/1", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Cheapest Path in K stops", url: "https://leetcode.com/problems/cheapest-flights-within-k-stops/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Prim MST", url: "https://www.geeksforgeeks.org/problems/minimum-spanning-tree/1", tags: ["dsa-sheet"] },
  { topic: "dsa-graphs", title: "Word Ladder", url: "https://leetcode.com/problems/word-ladder/", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode-02: Fibonacci", url: "https://leetcode.com/problems/fibonacci-number/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 03: Climbing Stairs", url: "https://leetcode.com/problems/climbing-stairs/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 04: House Robber", url: "https://leetcode.com/problems/house-robber/", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 05: 0/1 Knapsack", url: "https://www.geeksforgeeks.org/problems/0-1-knapsack-problem0945/1", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 06: tabulation Intro", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 07: 0/1 Knapsack Tabulation", url: "https://www.geeksforgeeks.org/problems/0-1-knapsack-problem0945/1", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 08: Subset sum", url: "https://www.geeksforgeeks.org/problems/subset-sum-problem-1611555638/1", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 09 : Target Sum", url: "https://www.geeksforgeeks.org/problems/target-sum-1626326450/1", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 10 : LIS", url: "https://leetcode.com/problems/longest-increasing-subsequence/", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 11 : LIS Tabulation", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 12 : LCS", url: "https://leetcode.com/problems/longest-common-subsequence/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 13 : Unique Paths", url: "https://leetcode.com/problems/unique-paths/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 14: Buy Sell Stocks", url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/description/", refs: ["https://leetcode.com/problems/best-time-to-buy-and-sell-stock-ii/description/", "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iii/description/", "https://leetcode.com/problems/best-time-to-buy-and-sell-stock-iv/description/"], steps: ["Best time to buy and sell stock", "Best time to buy and sell stock ii", "Best time to buy and sell stock iii", "Best time to buy and sell stock iv"], tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 15: MIn cost to cut stick", url: "https://leetcode.com/problems/minimum-cost-to-cut-a-stick/", tags: ["dsa-sheet"] },
  { topic: "dsa-dp", title: "Episode 16: Revision", tags: ["dsa-sheet"] },
  { topic: "dsa-greedy", title: "Lemonade", url: "https://leetcode.com/problems/lemonade-change/", tags: ["dsa-sheet"] },
  { topic: "dsa-greedy", title: "Jump Game", url: "https://leetcode.com/problems/jump-game/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-greedy", title: "Assign cookies", url: "https://leetcode.com/problems/assign-cookies/description/", tags: ["dsa-sheet"] },
  { topic: "dsa-greedy", title: "Fractional Knapsack", url: "https://www.geeksforgeeks.org/problems/fractional-knapsack-1587115620/1", tags: ["dsa-sheet"] },
];

/** Topic-wise topics with no pattern of their own: removed when empty, kept if you have cards in them. */
const RETIRED = ['dsa-arrays', 'dsa-strings', 'dsa-sorting', 'dsa-tries', 'dsa-bits', 'dsa-math'];

const problemKey = (url?: string) => url?.match(/(?:leetcode\.com|geeksforgeeks\.org)\/problems\/([^/?#]+)/)?.[1];
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

/**
 * Turns the DSA tree into the pattern tree. Your cards are never removed: matching ones (same
 * problem link or title) move into their pattern and keep status, notes and history; cards in
 * topics that fold into a pattern move with them. The Java track and topics you made are untouched.
 */
export function applyDsaPatterns(topics: Topic[], items: PracticeItem[], now: string): { topics: Topic[]; items: PracticeItem[] } {
  const isSheetTopic = (id: string) => DSA_PATTERNS.some((p) => p.id === id || p.absorbs.includes(id));
  const moveTo = new Map(DSA_PATTERNS.flatMap((p) => p.absorbs.map((a) => [a, p.id] as const)));
  const remap = (ids: string[]) => [...new Set(ids.map((id) => moveTo.get(id) ?? id))];

  // Cards: absorbed topics' cards move first, then each sheet problem is matched or added.
  let nextItems = items.map((i) => (moveTo.has(i.topicId) ? { ...i, topicId: moveTo.get(i.topicId)!, updatedAt: now } : i));
  const javaTopics = new Set(topics.filter((t) => t.track).map((t) => t.id));
  const claimed = new Set<string>();
  for (const card of CARDS) {
    const key = problemKey(card.url);
    const at = nextItems.findIndex(
      (i) =>
        i.domain === 'dsa' &&
        !javaTopics.has(i.topicId) &&
        !claimed.has(i.id) &&
        ((key && problemKey(i.url) === key && !card.title.toLowerCase().startsWith('episode')) || norm(i.title) === norm(card.title)),
    );
    const steps: SubItem[] = (card.steps ?? []).map((title) => ({ id: `ds-${slug(title)}`, title, done: false }));
    const notes = card.refs?.length ? `Also: ${card.refs.join(' ')}` : '';
    if (at === -1) {
      const item = makeItem(
        {
          id: `dsa:p-${card.topic.slice(4)}-${slug(card.title)}`,
          domain: 'dsa',
          topicId: card.topic,
          kind: 'problem',
          title: card.title,
          difficulty: card.difficulty,
          url: card.url,
          notes,
          tags: card.tags,
          ...(steps.length ? { subItems: steps } : {}),
          custom: true,
        },
        now,
      );
      claimed.add(item.id);
      nextItems.push(item);
      continue;
    }
    const it = nextItems[at];
    claimed.add(it.id);
    const have = new Set((it.subItems ?? []).map((s) => s.id));
    const add = steps.filter((s) => !have.has(s.id));
    nextItems[at] = {
      ...it,
      topicId: card.topic,
      url: it.url || card.url,
      difficulty: it.difficulty ?? card.difficulty,
      notes: it.notes?.trim() || notes,
      tags: [...new Set([...it.tags, ...card.tags])],
      ...(add.length ? { subItems: [...(it.subItems ?? []), ...add] } : {}),
      updatedAt: now,
    };
  }

  // Topics: the patterns in the sheet's order, where the DSA topics were; kept leftovers after them.
  const count = new Map<string, number>();
  for (const i of nextItems) count.set(i.topicId, (count.get(i.topicId) ?? 0) + 1);
  const patternTopics: Topic[] = DSA_PATTERNS.map((p) => {
    const old = topics.find((t) => t.id === p.id);
    return {
      ...(old ?? { custom: true }),
      id: p.id,
      domain: 'dsa',
      name: p.name,
      tier: p.tier,
      prerequisites: p.prerequisites,
      target: CARDS.filter((c) => c.topic === p.id).length,
      description: p.description,
    } as Topic;
  });
  const keep = (t: Topic) => t.domain !== 'dsa' || t.track || !(isSheetTopic(t.id) || (RETIRED.includes(t.id) && !count.get(t.id)));
  const first = topics.findIndex((t) => t.domain === 'dsa' && !t.track);
  const before = topics.slice(0, Math.max(0, first)).filter(keep);
  const after = topics.slice(Math.max(0, first)).filter(keep);
  const ids = new Set([...before, ...patternTopics, ...after].map((t) => t.id));
  const nextTopics = [...before, ...patternTopics, ...after].map((t) =>
    t.domain === 'dsa' && !t.track ? { ...t, prerequisites: remap(t.prerequisites).filter((p) => ids.has(p) && p !== t.id) } : t,
  );
  return { topics: nextTopics, items: nextItems };
}
