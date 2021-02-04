# rxjs-query
[![npm version](https://img.shields.io/npm/v/rxjs-query.svg?style=flat)](https://www.npmjs.com/package/rxjs-query)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/znaczek/rxjs-query/blob/master/LICENSE.txt)
[![CircleCI](https://circleci.com/gh/znaczek/rxjs-query.svg?style=shield)](https://circleci.com/gh/znaczek/rxjs-query)

### Tool for managing asynchronous data based on [RxJS](https://github.com/ReactiveX/rxjs) observables.

### Features
- Framework agnostic, depends only on RxjS
- Independent of data transfer layer (http, ws)
- stale-while-revalidate
- Available from different places (different services, components etc.)
- Request status + error handling
- Request cancellation
- Caching based on request payload
- Small bundle footprint

### Inspirations
- [react-query](https://github.com/tannerlinsley/react-query)
- [NgRx with @ngrx/effect](https://github.com/ngrx/effects)

## Table of contents

- [Motivation](#Motivation)
- [Concepts](#Concepts)
- [Api](#api)
- [Examples](#Examples)


# Motivation
Making simple requests that returns data or throws an error is not enough to easily provide good user experience.
We also need indication of data loading, error handling, caching, tracking state of request etc.


**Rxjs-query provides an additional layer of abstraction over api calls bringing functionality to manage these calls**

Sometimes developers chose redux by default as data management tool, although:

>You might not need redux

A lot of articles can be found over the internet which says exactly this and that documentation won't threat about it.
However, this provides similar functionality, that can be achieved with redux - without redux.
What can be seen in decent amount of redux usages (e.g. using ngrx as redux implementation in Angular) is that there are 3 types of actions:
- start,
- success,
- error.

We call `start` in a component. Then there is something that handles side effect (e.g. @ngrx/effects) that depending on the result of the http call
dispatches `success` or `error`. The data stream itself comes from selection of the redux store.
That's how a nice **command-query separation (CQS)** comes in:
- dispatched actions are the command part,
- store selection is the query part.

In rxjs-query we achieve similar result without overhead of redux using. See [$, actions and events](#concepts)

## Angular
Although rxjs-query is framework agnostic, it was developed with Angular usage in mind.
That's why it works perfectly Angular HttpClient, but it can be used with any http library.
The only requirement is that it needs to operate on RxJs observables or anything that can be mapped to an observable.

# Concepts
The main concern in rxjs-query is `Repository` class. It contains 3 fields:
- **$** - the data stream representing data being held by a repository.
This stream emits value right after subscription. If request was not made yet it will emit value with `data: null` or the last emitted value ([see Request status](#request-state)).
This way we achieve **stale-while-revalidate** - at any time we will get the latest data fetched or null on the beginning.
It will emit values of type [RepositoryData](#repositorydata).
    - **data** (the `T` type variable)- the proper data that are stored. In most cases it will be just the response body from (eventually piped) api call.
    - **isPending** - boolean flag indicating whether request is pending.
    - **error** - object containing details about last error. By default, it will be error that is thrown from
- **actions** - set of methods to operate on the repository,
- **events** set of observables that emit events of a repository lifecycle.

### Command-query separation

Thanks to separation of '$' and 'actions' we have a clear separation of query and commands. Once a repository is created the data stream
can be used (subscribed) somewhere and all the actions can be called from different places.
`events` stream also allows us to listen to all actions that were been called anywhere else in the application.
See more in [examples](#examples)

### RepositoryData
This is the type of object that is being emitted by `$`:
```typescript
class RepositoryData<D, E = unknown> {
    data: D;
    progress: number;
    isPending: boolean;
    error: E;
}
```
### Request state
RequestCombination of three values from RepositoryData: `data`, `isPending` and `error` we can clearly indicate status of the request:

Initial state
```
{
    data: null,
    isPending: false,
    progress: null,
    error: null
}
```

Initial fetching
```
{
    data: null,
    isPending: true,
    progress: null,
    error: null
}
```
Data successfully fetched
```
{
    data: {/*data*/},
    isPending: false,
    progress: null,
    error: null
}
```

Request resulted with error (first of each subsequent)
```
{
    data: {/*data*/}, // or null
    isPending: false,
    progress: null,
    error: {/*error object*/}
}
```

Subsequent fetch started
```
{
    data: {/*data*/}
    isPending: true,
    progress: null,
    error: null
}
```

Request made a progress
```
{
    data: {/*data*/} // or null
    isPending: true,
    progress: 0.6,
    error: null
}
```

Principal is simple:
- set `isPendinng` to true and null the `error` when request starts,
- populate `data`, set `isPending` to false, null the `progress` on request success
- populate `error` on request results with an error,
- populate `progress` with a number when `progressHandler` returns a number
(technically it can be any number but values from <0, 1) makes most sense in terms of indicating progress).

Error object can we whatever the request throws when request observable emits an error.


# Api
### Config
We pass a configuration while constructing Repository
```
export class Config<P, R, SH, EH> {
  caller: Caller<P, R>;
  initData: SuccessPayload<R, SH>;
  cache = false;
  shouldCache: (prev: TypedPayload<P>, next: TypedPayload<P>) => boolean;
  cacheTimeout = 5000;
  progressHandler: (event: R) => number | null;
  successHandler: SH;
  errorHandler: EH;
}
```
Not entire object can be passed. Only the values that we want to set/override needs to be present.

##### caller
Function that returns data source observable emitting the data. Can be passed as a `caller` property in config parameter:
```
new Repository ({caller: () => {}))
```
or with a shorthand syntax if no other property is passed.
```
new Repository (() => {})
```
**NOTICE:** Error handling using `catchError` can't be done inside this function.
Error from the returned observable will be handled in the Repository itself.
To intercept and modify error object use [errorHandler](#errorhandler)

##### innitData
By default, Repository is initialised with `null`. We can change initial data seed with `initData`.

##### cache
Boolean flag indicating whether instead of invoking the caller, the last result should be emitted.

##### shouldCache
Callback predicate that based on the previous payload and current payload decides whether to use cache.
Works only when `cache=true`.

##### cacheTimeout
Additional numeric value in ms to invalidate the cache.

##### progressHandler
Callback that is used to track request progress. To do so the data source observable must not emit one value and close.
It must first emit events that indicate progress and as the last emitted value.
The contract is that for progress event `progressHandler` returns a number representing progress and `null`, when the request finished.

##### successHandler
Callback where the data received from can be mapped before store in Repository.
**NOTICE:** In most of the cases the data can be mapped using `.pipe` on the data source observable.
Use case for `successHandler` is when we are using `progressHandler` and want to map the value as the las emitted event.

##### errorHandler
Callback where we can map the request error to any object that we want to be populated in the `error` field.

### $
The data stream itself. Explained in more detail in [concepts](#concepts) section.

### Actions
##### start
Action that starts the request. Under the hood the caller function will be called.
Under the hood it uses `switchMap` operator, so if a request is still pending, next start invocation will cancel the pending one.

##### reset
Will emit on `$` the initial state. Cancels the outgoing request.

##### cleanError
Cleans the error. Helpful when we want to clear only the error without clearing the last emitted data.

##### cancel
Cancels the request only.

### Events
##### start$
Emits when `start` method is called. Payload parameter is the same that we will receive in caller.

##### progress$
Emits value returned by `progressHandler` when caller emits progress event.

##### success$
Emits when request ends successfully.

##### successCached$
Emits the last value after `start` method was called but `shouldCache` method returns true.

##### error$
Emits when caller throws an error. Populated with the error or return of `errorHandler`.

##### cancel$
Emits when `cancel` method is called.

##### reset$
Emits when `reset` method is called.


# Examples
Presented below example is written in Angular but show the overall idea of how to use Repository.
Classes are simplified to emphasise only the logic around Repository usage.

Let's analyse a simple scenario:
- we have 2 smart components list and form,
- in the list view we have one add button and edit button in each list row,
- add and edit button opens form in a dialog,
- after form submission list should be refreshed.

So let's start with creating a repository:

```typescript
class TodosRepository {
    constructor(private http: HttpClient) {}

    public list = new Repository(() => this.http.get('/api/todos/'));
    public save = new Repository((payload) => {
        if (payload.id) {
            return this.http.put('/api/todos', payload);
        } else {
            return this.http.post('/api/todos', payload);
        }
    });
}
```

Now we can look into what will happen in the
```typescript
class ListComponent {
    public list$: Observable<RepositoryData<string[]>>

    constructor(private repository: TodosRepository) {
        // commands part
        this.repository.list.actions.start();
        this.repository.save.events.success$.subscribe(() => {
            this.repository.list.actions.start();
        });

        // query part
        this.list$ = this.repository.list.$;                 
        this.repository.list.$.subscribr((data) => {
            console.log(`Data emitted: ${data}`);
        })
    }

    public onAdd() {
        // we open a dialog for creation
    }

    public onAdd() {
        // we open a dialog for edition
    }

}
```
Here we see, that on the initialisation of the component we fetch the data for the first time.
Then after successful save the list is refreshed.
So in list component we listen to save event without worrying who and when is doing the save.

Html could look like:
```angular2html
<div class="loader" *ngIf="(list$ | async).isPending"></div>
<div class="error" *ngIf="(list$ | async).error">{{ (list$ | async).error }}</div>
<div *ngFor="let todo of (list$ | async).data">{{ todo }}</div>
```

Next we have the form component
```typescript
class FormComponent {

    constructor(private repository: TodosRepository) {
    }

    public onSubmit(model: Todo) {
        this.repository.save.actions.start(model);
    }
}
```
Here we don't initiate any request on the component initialisation. We only invoke save action on form submit.
After the request finishes the `events.success$` emits an event that is capture in ListComponent.
