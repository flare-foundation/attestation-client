// Simple and efficient implementation of a queue suitable for larger sizes

export class Queue<T> {
   data: { [key: number]: T } = {};
   head = 0;
   tail = 0;

   public push(item: T): void {
      this.data[this.tail] = item;
      this.tail++;
   }

   public shift(): T {
      let item = this.data[this.head];
      delete this.data[this.head];
      this.head++;
      return item;
   };
}