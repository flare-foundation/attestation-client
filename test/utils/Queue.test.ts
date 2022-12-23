import { assert, expect } from "chai";
import { Queue } from "../../src/utils/Queue";
import { getTestFile } from "../test-utils/test-utils";

describe(`Queue ${getTestFile(__filename)})`, () => {
  let queue = new Queue<Number>();
  for (let i = 0; i < 15; i++) {
    queue.push(i);
  }

  it("Should prepend", () => {
    const preSize = queue.size;
    queue.prepend(91);
    assert(queue.size === preSize + 1);
  });

  it("Should return first element in the queue", () => {
    assert(queue.shift() === 91);
    assert(queue.size === 15);
  });

  it("Should push", () => {
    const preSize = queue.size;
    queue.push(91);
    assert(queue.size === preSize + 1);
  });

  it("Should destroy queue", () => {
    queue.destroy();
    assert(queue.size === 0);
  });

  it("Should not get the first from an empty queue", () => {
    expect(() => {
      queue.first;
    }).to.throw("Empty queue");
  });
});
