// Simple and efficient implementation of a queue suitable for larger sizes

export class Queue<T> {
   private data: { [key: number]: T } = {};
   private head = 0;
   private tail = 0;

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

   public get size() {
      return this.tail - this.head;
   }

   public destroy() {
      delete this.data;
      this.data = {};
   }
}