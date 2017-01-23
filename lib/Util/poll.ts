/**
 * eg.
 *
 *  poll(
 *    () => Promise.resolve(Math.random()),
 *    val => val > 0.5
 *  )
 *    .then(val => console.log(`You won, with ${val}!`));
 */
function poll<TRes extends any>(
  run: () => IMaybePromise<TRes>,
  predicate?: (res:TRes) => IMaybePromise<boolean>,
  opts?: {
    timeout?: number,
    interval?: number
  }
):
Promise<TRes>
{
  predicate || (predicate = val => !!val);

  opts = Object.assign({
    timeout: 10000,
    interval: 100
  }, opts || {});

  return new Promise((resolve, reject) => {
    const intervalRef = setInterval(() => {
      Promise.resolve(run())
        .then(val => Promise.resolve(predicate(val))
          .then(isComplete => {
            if (isComplete) {
              clearClock();
              resolve(val);
            }
          })
        )
        .catch(err => {
          clearClock();
          reject(err);
        })
    }, opts.interval);

    const timeoutRef = setTimeout(() => {
      clearClock();
      reject(new Error(`Poll timed out after ${opts.timeout}ms`));
    }, opts.timeout || Infinity);

    const clearClock = () => {
      clearTimeout(timeoutRef);
      clearInterval(intervalRef);
    };
  })
}
export default poll;

export type IMaybePromise<TRes extends any> = TRes | Promise<TRes>;