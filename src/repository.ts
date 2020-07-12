import { BehaviorSubject, EMPTY, Observable, Subject } from 'rxjs';
import { catchError, filter, scan, switchMap, takeUntil } from 'rxjs/operators';
import { DeepPartial } from './deep-partial';
import { isEqual } from 'lodash';

/**
 * TODO
 * - canceling on reset/cancel
 * - POST (mutations)
 * - list fetch
 * - infinite fetch
 * - clean subscription after usage with remebering last data
 * - test with progress
 * - Tests
 * - Refactor
 */
export class Repository<T, P> {
  public actions: Actions<P>;

  public get events(): Events<T, P> {
    return this._events;
  }

  public get $(): Observable<RepositoryData<T>> {
    return this.data$.asObservable();
  }

  private config: Config<T, P>;
  private cacheChecker: (a: P, b: P) => boolean;

  private data$: BehaviorSubject<RepositoryData<T>>;

  private _events = {
    start$: new Subject<P>(),
    progress$: new Subject<number>(),
    success$: new Subject<T>(),
    successCached$: new Subject<T>(),
    error$: new Subject<any>(),
  };

  private lastCallTimestamp = 0;

  private close$ = new Subject<void>();

  constructor(arg: Caller<T, P> | DeepPartial<Config<T, P>>) {
    if (typeof arg === 'function') {
      this.config = new Config({caller: arg});
    } else {
      this.config = new Config(arg);
    }

    this.cacheChecker = this.config.cache ? isEqual :
      typeof this.config.shouldCache === 'function' ? this.config.shouldCache :
        null;

    this.createDataStream();
    this.createActions();
    this.subscribeToEvents();
  }

  private createDataStream() {
    this.data$ = new BehaviorSubject(new RepositoryData(this.config.initData));

    this.data$.pipe(
      takeUntil(this.close$),
      // tap((v) => console.log('DATA', v))
    ).subscribe();
  }

  private subscribeToEvents() {
    this._events.start$
      .pipe(
        scan((acc: { payload: P, shouldUseCache: boolean }, current: P) => {
          const previousPayload = acc.payload;

          const shouldUseCache =
            this.cacheChecker &&
            this.cacheChecker(previousPayload, current) &&
            this.lastCallTimestamp + this.config.cacheTimeout >= Date.now();

          if (shouldUseCache) {
            this._events.successCached$.next(this.data$.getValue().data);
          }
          return {payload: current, shouldUseCache};
        }, {payload: null, shouldUseCache: false}),
        filter(({shouldUseCache}) => !shouldUseCache),
        switchMap(({payload}) => {
          let callResult: Observable<T>;
          try {
            callResult = this.config.caller(payload);
          } catch (e) {
            console.error(e);
            callResult = EMPTY;
          }
          return callResult
            .pipe(
              catchError((error) => {
                this._events.error$.next(error);
                this.data$.next(new RepositoryData({error}));
                return EMPTY;
              })
            );
        }),
        takeUntil(this.close$),
      )
      .subscribe((data) => {
        this.lastCallTimestamp = Date.now();
        this._events.success$.next(data);
        this.data$.next(new RepositoryData<T>({data}));
      });
  }

  public close(): void {
    this.close$.next();
  }

  private createActions() {
    this.actions = {
      start: (payload) => {
        this._events.start$.next(payload);
        this.data$.next(new RepositoryData<T>({
          data: this.data$.getValue().data,
          isPending: true,
          error: null,
        }));
      },
      reset: () => {
      },
      cleanError: () => {
      },
      cancel: () => {
      },
    };
  }

}

type Caller<T, P> = (payload: P) => Observable<T>;

class Config<T, P> {
  caller: Caller<T, P>;
  initData: T = null;
  cache = false;
  shouldCache: (prev: P, next: P) => boolean = null;
  cacheTimeout = 5000;

  constructor(options: DeepPartial<Config<T, P>>) {
    Object.assign(this, options);
  }
}

interface Actions<P> {
  start: (props: P) => void;
  reset: () => void;
  cleanError: () => void;
  cancel: () => void;
}

interface Events<T, P> {
  start$: Observable<P>;
  progress$: Observable<number>;
  success$: Observable<T>;
  successCached$: Observable<T>;
  error$: Observable<any>;
}

export class RepositoryData<T> {
  data: T;
  progress: number = null;
  isPending = false;
  error: any = null;

  constructor(options: DeepPartial<RepositoryData<T>>) {
    options = options || {};
    this.data = options.data || null;
    this.progress = options.progress || null;
    this.isPending = options.isPending === true;
    this.error = options.error || null;
  }

}
