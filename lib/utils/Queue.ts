// Simple and efficient implementation of a queue suitable for larger sizes

export class Queue<T> {
  private data: { [key: number]: T } = {};
  private head = 0; // first index
  private tail = 0; // first empty index

  public push(item: T): void {
    this.data[this.tail] = item;
    this.tail++;
  }

  public prepend(item: T): void {
    this.data[this.head - 1] = item;
    this.head--;
  }

  // Can be called only if head < tail
  public shift(): T {
    let item = this.data[this.head];
    delete this.data[this.head];
    this.head++;
    return item;
  }

  public get size() {
    return this.tail - this.head;
  }

  public get first(): T {
    if (this.size > 0) {
      return this.data[this.head];
    }
    throw Error("Empty queue");
  }

  //Is this the desired outcome???
  public destroy() {
    delete this.data;
    this.data = {};
    this.tail = 0;
    this.head = 0;
  }
}
