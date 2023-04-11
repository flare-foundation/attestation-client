// yarn test test/utils/priorityQueue.test.ts

import { assert } from "chai";
import { PriorityQueue } from "../../src/utils/data-structures/PriorityQueue";
import { getTestFile } from "../test-utils/test-utils";

describe(`PriorityQueue, (${getTestFile(__filename)})`, () => {
  let priorityQueueEmpty = new PriorityQueue<number>();
  let priorityQueue = new PriorityQueue<number>();

  for (let j = 0; j < 25; j++) {
    priorityQueue.push(25 - j, 25 - j);
  }
  for (let j = 26; j < 50; j++) {
    priorityQueue.push(j, j);
  }
  it("Should recognize empty queue", () => {
    assert(priorityQueueEmpty.isEmpty());
  });

  it("Should pop null from empty queue", () => {
    assert(priorityQueueEmpty.pop() === null);
  });
  it("Should peek  null from empty queue", () => {
    assert(priorityQueueEmpty.peek() == null);
  });

  it("Should peek null key from empty queue", () => {
    assert(priorityQueueEmpty.peekKey() == null);
  });

  it("Should recognize nonempty queue", () => {
    assert(!priorityQueue.isEmpty());
  });

  it("Should find length", () => {
    assert(priorityQueue.length() == 49);
  });

  it("Should peek value", () => {
    assert(priorityQueue.peek() == 1);
  });

  it("Should peek key", () => {
    assert(priorityQueue.peekKey() == 1);
  });

  it("Should pop the most urgent value", () => {
    for (let j = 1; j < 20; j++) {
      assert(priorityQueue.pop() == j);
    }
  });
});
