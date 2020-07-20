import { BehaviorSubject, EMPTY, merge, Observable, Subject } from 'rxjs';
import { catchError, filter, map, scan, switchMap, takeUntil, tap } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { isFunction } from 'rxjs/internal-compatibility';

/**
 * TODO
 * - what will happen, when unsubscribed (0 subscribtions fo "$") - will it loose data?
 * - try to unsubscribe, when "$" subscribtions are at size of 0
 * - Tests
 * - Refactor
 */
export class Repository<P, R,
  SH extends (response: R, state: SuccessPayload<R, SH>, P) => SuccessPayload<R, SH>,
  EH extends (error: any) => ErrorPayload<EH>> {
  public actions: Actions<TypedPayload<P>>;

  public get events(): Events<TypedPayload<P>, SuccessPayload<R, SH>, ErrorPayload<EH>> {
    return this._events;
  }

  public get $(): Observable<RepositoryData<SuccessPayload<R, SH>, ErrorPayload<EH>>> {
    return this.data$.asObservable().pipe(
      takeUntil(this.close$),
    );
  }

  private config: Config<P, R, SH, EH>;
  private cacheChecker: (a: TypedPayload<P>, b: TypedPayload<P>) => boolean;

  private data$: BehaviorSubject<RepositoryData<SuccessPayload<R, SH>, ErrorPayload<EH>>>;

  private _events = {
    start$: new Subject<TypedPayload<P>>(),
    progress$: new Subject<number>(),
    success$: new Subject<SuccessPayload<R, SH>>(),
    successCached$: new Subject<SuccessPayload<R, SH>>(),
    error$: new Subject<ErrorPayload<EH>>(),
    reset$: new Subject<void>(),
    cancel$: new Subject<void>(),
  };

  private lastCallTimestamp = 0;

  private close$ = new Subject<void>();

  constructor(arg: Caller<P, R> | Partial<Config<P, R, SH, EH>>) {
    if (isFunction(arg)) {
      this.config = new Config({caller: arg});
    } else {
      this.config = new Config(arg);
    }

    this.cacheChecker = this.config.cache ? isEqual :
      typeof isFunction(this.config.shouldCache) ? this.config.shouldCache :
        null;

    this.createDataStream();
    this.createActions();
    this.subscribeToEvents();
  }

  private createDataStream() {
    this.data$ = new BehaviorSubject(new RepositoryData(this.config.initData));
  }

  private subscribeToEvents() {
    const startSource$ = this._events.start$
      .pipe(
        scan((acc: { payload: TypedPayload<P>, shouldUseCache: boolean }, current: TypedPayload<P>) => {
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
        tap(() => {
          this.data$.next(new RepositoryData({
            data: this.data$.getValue().data,
            isPending: true,
            error: null,
          }));
        }),
        map(({payload}) => ({type: 'START', payload}))
      );

    const resetSource$ = merge(this._events.reset$, this._events.cancel$).pipe(
      map(() => ({type: 'RESET'}))
    );

    merge(startSource$, resetSource$)
      .pipe(
        switchMap((action: {type: 'RESET'} | {type: 'START', payload: TypedPayload<P>}) => {
          if (action.type === 'RESET') {
            return EMPTY;
          }

          let callResult: Observable<R>;
          try {
            callResult = this.config.caller(action.payload);
          } catch (e) {
            console.error(e);
            callResult = EMPTY;
          }
          return callResult
            .pipe(
              map((response) => {
                if (isFunction(this.config.progressHandler)) {
                  const progress = this.config.progressHandler(response);
                  this._events.progress$.next(progress);
                  return {response, payload: action.payload, isComplete: progress === null};
                } else {
                  return {response, payload: action.payload, isComplete: true};
                }
              }),
              catchError((error) => {
                const errorPayload: ErrorPayload<EH> = isFunction(this.config.errorHandler) ?
                  this.config.errorHandler(error) :
                  error;
                this._events.error$.next(errorPayload);
                this.data$.next(new RepositoryData({error: errorPayload}));
                return EMPTY;
              }),
            );
        }),
        takeUntil(this.close$),
        filter(({isComplete}) => isComplete)
      )
      .subscribe(({response, payload}) => {
        let data: SuccessPayload<R, SH>;
        if (isFunction(this.config.successHandler)) {
          data = this.config.successHandler(response, this.data$.getValue().data, payload);
        } else {
          data = response as SuccessPayload<R, SH>;
        }
        this.lastCallTimestamp = Date.now();
        this._events.success$.next(data);
        this.data$.next(new RepositoryData({data}));
      });
  }

  public close(): void {
    this.close$.next();
  }

  private createActions() {
    this.actions = {
      start: (payload) => {
        this._events.start$.next(payload);
      },
      reset: () => {
        this._events.reset$.next();
        this.data$.next(new RepositoryData());
      },
      cleanError: () => {
        this.data$.next(new RepositoryData({
          ...this.data$.getValue().data,
          error: null,
        }));
      },
      cancel: () => {
        this._events.cancel$.next();
      },
    };
  }

}

export class RepositoryData<D, E> {
  data: D;
  progress: number;
  isPending: boolean;
  error: E;

  constructor(options?: Partial<RepositoryData<D, E>>) {
    options = options || {};
    this.data = options.data || null;
    this.progress = options.progress || null;
    this.isPending = options.isPending === true;
    this.error = options.error || null;
  }

}

export class Config<P, R, SH, EH> {
  caller: Caller<P, R>;
  initData: SuccessPayload<R, SH>;
  cache = false;
  shouldCache: (prev: P, next: P) => boolean;
  cacheTimeout = 5000;
  progressHandler: (event: R) => number | null;
  errorHandler: EH;
  successHandler: SH;

  constructor(options: Partial<Config<P, R, SH, EH>>) {
    Object.assign(this, options);
  }
}

type Caller<P, R> = (payload: TypedPayload<P>) => Observable<R>;

interface Actions<P> {
  start: (payload: P) => void;
  reset: () => void;
  cleanError: () => void;
  cancel: () => void;
}

type ErrorPayload<EH> = EH extends (error: unknown) => infer E ? E : unknown;
type SuccessPayload<R, SH> = SH extends (response: R, state: infer D, payload: any) => infer D ? D : R;

interface Events<P, D, E> {
  start$: Observable<P>;
  progress$: Observable<number>;
  success$: Observable<D>;
  successCached$: Observable<D>;
  error$: Observable<E>;
  cancel$: Observable<void>;
  reset$: Observable<void>;
}

type TypedPayload<P> = P extends object ? P : void;
