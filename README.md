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
- Loading flag + error handling
- Request cancelation
- Caching based on request payload

## Table of contents

- [Motivation](#Motivation)
- [Concepts](#Concepts)
- [Api](#Features)
- [Examples](#Examples)


# Motivation
Making simple requests that returns data or throws an error is not enough to easily provide good user experience.
We also need indication of data loading, error handling, caching, tracking state of request etc.

**Rxjs-query provides an additional layer of abstraction above api calls bringing functionality to manage those calls**

Sometimes developers chose redux by default as data management tool, although:
>You might not need redux

A lot of articles can be found over the internet which says exactly this and that documentation won't threat about it.
However this provides similar functionality, that can be achieved with redux - without redux.

## Angular
Although rxjs-query is framework agnostic, it was developed in context of Angular application.
That's why it works perfectly Angular HttpClient, but it can be used with any http library.
The only circumstance is that it needs to operate on RxJs observables or anything that can be switched to observables.

# Concepts
TODO Describe caller
Rxjs-query uses a concept of repository, that is a regular JS object containing 3 fields:
- **$** - the data stream
- **actions** - set of methods to operate on the repository
- **events** set of observables that emit events of a repository lifecycle

**$** is the main data stream. It provides declarative stream of data that are being hold by repository:
- **data** - the proper data that are stored. In most cases it will be just the response body from api call,
but using **[successHandler](#)** callback we can transform response to any other object.
- **isPending** - boolean flag indicating whether request is pending
- **error** - object containing details about last error. By default it will be error that is thrown from
**[caller](#)**. By using **[errorHandler](#)** error body can be transformed as needed.
- **progress** - numeric value indicating progress of the request. Defaults to `null`, to track the progress **[progressHandler](#)** that returns number must be provided.

TODO how it's cached (stale-while-revalidate)
TODO why no status field

In the most basic scenario the api call invocation method must be provided and data stream as observable is available to use,
that an be controller with a set of methods called actions.

# Examples
TODO

# Api
TODO
Describe what are the possible data states


