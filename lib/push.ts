/**
 * Which push subscriptions to delete after a send.
 *
 * - 404 / 410: the push service says the subscription no longer exists.
 *   Always delete.
 * - 401 / 403: the push service refused our credentials for it. That happens
 *   for subscriptions made with a different key pair, which can never work
 *   again. But it is also what every subscription returns if the server's own
 *   keys are wrong, so delete these only when at least one other send in the
 *   same batch succeeded: that proves the server's keys are fine and the fault
 *   is with the subscription.
 */
export function subscriptionsToPrune<T>(
  subscriptions: T[],
  results: PromiseSettledResult<unknown>[],
): T[] {
  const anySucceeded = results.some(r => r.status === 'fulfilled')
  return subscriptions.filter((_, index) => {
    const result = results[index]
    if (!result || result.status !== 'rejected') return false
    const statusCode = (result.reason as { statusCode?: number } | undefined)?.statusCode
    if (statusCode === 404 || statusCode === 410) return true
    if ((statusCode === 401 || statusCode === 403) && anySucceeded) return true
    return false
  })
}
