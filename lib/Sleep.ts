export async function sleep(seconds: number) {
  await sleepms(seconds * 1000);
}

export async function sleepms(milliseconds: number) {
  await new Promise((resolve: any) => {
    setTimeout(() => {
      resolve();
    }, milliseconds);
  });
}

// export async function yieldms() {
//     await sleepms( parseInt( process.env.NETWORK_YIELD_WAIT , 10 ) )
// }
