/**
 * Interface for elements of queue
 * key represents time when the value (attestation) should be procesed and is used as a criterion for sorting,
 */
export interface QueueNode<T> {
  key: number;
  value: T;
}
/**
 * Heap implementation of priority queue
 */
export class PriorityQueue<T> {
  heap: QueueNode<T>[] = [];

  left = (index: number) => 2 * index + 1;
  right = (index: number) => 2 * index + 2;
  hasLeft = (index: number) => this.left(index) < this.heap.length;
  hasRight = (index: number) => this.right(index) < this.heap.length;
  parent = (index: number) => Math.floor((index - 1) / 2);

  isEmpty(): boolean {
    return this.heap.length == 0;
  }

  /**
   * returns the value of the first element in queue
   */
  peek(): T | null {
    return this.heap.length == 0 ? null : this.heap[0].value;
  }

  /**
   * returns the value of the first element in queue
   */
  peekKey(): number | null {
    return this.heap.length == 0 ? null : this.heap[0].key;
  }

  length(): number {
    return this.heap.length;
  }

  /**
   * Swaps elements at index a and b
   * @param a
   * @param b
   */
  swap(a: number, b: number): void {
    const tmp = this.heap[a];
    this.heap[a] = this.heap[b];
    this.heap[b] = tmp;
  };

  /**
  * Adds an elements to priority Queue and puts it at the right place according to the priority
  * @param item
  * @param priority
  */
  push(item: T, priority: number): void {
    this.heap.push({ key: priority, value: item });

    let addedIndex = this.heap.length - 1;
    while (addedIndex > 0) {
      const parentIndex = this.parent(addedIndex);
      if (this.heap[parentIndex].key < this.heap[addedIndex].key) break;
      this.swap(addedIndex, parentIndex);
      addedIndex = parentIndex;
    }
  }

  /**
   * Removes and returnes the first element from the queue and sorts the rest
   * @param item
   * @param priority
   */
  pop(): T | null {
    if (this.heap.length == 0) return null;

    this.swap(0, this.heap.length - 1);
    const item = this.heap.pop();

    let current = 0;
    while (this.hasLeft(current)) {
      let smallerChild = this.left(current);
      if (this.hasRight(current) && this.heap[this.right(current)].key < this.heap[this.left(current)].key) smallerChild = this.right(current);

      if (this.heap[smallerChild].key > this.heap[current].key) break;

      this.swap(current, smallerChild);
      current = smallerChild;
    }

    return item.value;
  }
}
