- Try to unsubscribe from the internal subject, when "$" subscriptions are at size of 0 and resubscribe at next subscription.
This will do a bit of cleaning after `.subscribe` in the Repository constructor.
- Instead of using `progressHanndler` with `successHandler` pass progressCallback as a parameter
of caller, call it in e.g. `tap`, filter progress events and allow one value to be emitted by data source that would be the data received.
This way we can remove success handler.
- `caller` should also receive current state.
- `shouldCache` should receive current state.
- Complete in the documentation
- Unit testing to cover all statements/branches/cases.
- Provide more examples examples
