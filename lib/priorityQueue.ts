interface QueueNode<T> {
  key: number;
  value: T;
}

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

  peek(): T | null {
    return this.heap.length == 0 ? null : this.heap[0].value;
  }
  peekKey(): number | null {
    return this.heap.length == 0 ? null : this.heap[0].key;
  }

  length(): number {
    return this.heap.length;
  }

  swap = (a: number, b: number) => {
    const tmp = this.heap[a];
    this.heap[a] = this.heap[b];
    this.heap[b] = tmp;
  };

  push(item: T, priority: number): void {
    this.heap.push({ key: priority, value: item });

    let i = this.heap.length - 1;
    while (i > 0) {
      const p = this.parent(i);
      if (this.heap[p].key < this.heap[i].key) break;
      const tmp = this.heap[i];
      this.heap[i] = this.heap[p];
      this.heap[p] = tmp;
      i = p;
    }
  }

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

    return item!.value;
  }
}
