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
- [Api](#Features)
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

In rxjs-query we achieve similar result without overhead of using redux:
- [actions](#) gives us the commands to control the data fetching,
- [$](#) gives us the data stream,
- [events](#) gives us additional opportunity to listen to particular events that happened in the repository.

## Angular
Although rxjs-query is framework agnostic, it was developed with Angular usage in minnd.
That's why it works perfectly Angular HttpClient, but it can be used with any http library.
The only requirement is that it needs to operate on RxJs observables or anything that can be mapped to an observable.

# Concepts
The main concern in rxjs-query is `Repository` class. It contains 3 fields:
- **$** - the data stream representing data being held by a repository.
It will emit values of type [RepositoryData<T>](#).
    - **data** (the `T` type variable)- the proper data that are stored. In most cases it will be just the response body from (eventually piped) api call.
    - **isPending** - boolean flag indicating whether request is pending.
    - **error** - object containing details about last error. By default, it will be error that is thrown from
- **actions** - set of methods to operate on the repository,
- **events** set of observables that emit events of a repository lifecycle.

### Request status
Combination of three values from RepositoryData: `data`, `isPending` and 'error' we can clearly indicate status of the request:
TODO add progress
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
    data: {<data>},
    isPending: false,
    progress: null,
    error: null
}
```

Request resulted with error (first of each subsequent)
```
{
    data: {<data>} || null,
    isPending: false,
    progress: null,
    error: {<error object>}
}
```

Subsequent fetch 
```
{
    data: {<data>},
    isPending: true,
    progress: null,
    error: null
}
```

Request made a progress
```
{
    data: {<data>},
    isPending: true,
    progress: <number>,
    error: null
}
```

Principal is simple:
- set `isPendinng` to true and null the `error` when request starts,
- populate `data` on request success, set `isPending` to false, null the `progress`
- populate `error` on request results with an error,
- populate `progress` with a number (technically it can be any number but values from <0, 1) makes most sense in terms of indicating progress)).

### Caching - stale-while-revalidate
TODO

### Command-query separation

In the most basic scenario the api call invocation method must be provided and data stream as observable is available to use,
that can be controller with a set of methods called actions.

# Api
TODO

# Examples
Basic usage
```
const todoRepository = new Repository(() => this.http.get('/api/todos'));
```
