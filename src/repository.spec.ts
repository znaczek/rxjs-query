import { Repository, RepositoryData } from './repository';
import { of } from 'rxjs';

const gatherEvents = (repository: Repository<any, any, any, any>) => {
  const events = {
    start: [],
    progress: [],
    success: [],
    successCached: [],
    error: [],
    cancel: [],
    reset: [],
  };

  repository.events.start$.subscribe((s) => events.start.push(s));
  repository.events.progress$.subscribe((s) => events.progress.push(s));
  repository.events.success$.subscribe((s) => events.success.push(s));
  repository.events.successCached$.subscribe((s) => events.successCached.push(s));
  repository.events.error$.subscribe((s) => events.error.push(s));
  repository.events.cancel$.subscribe((s) => events.cancel.push(s));
  repository.events.reset$.subscribe((s) => events.reset.push(s));
  return events;
};

const gatherData = (repository: Repository<any, any, any, any>) => {
  const data = [];
  repository.$.subscribe((d) => data.push(d));
  return data;
};

describe('Repository', () => {

  it('should handle api call with all according events', () => {

    const repository = new Repository((payload: {key: string}) => of({a: 1, b: 'd'}));

    const events = gatherEvents(repository);
    const data = gatherData(repository);


    repository.actions.start({key: '123'});

    expect(data).toEqual([
      new RepositoryData({
        data: null,
        progress: null,
        isPending: false,
        error: null,
      }),
      new RepositoryData({
        data: null,
        progress: null,
        isPending: true,
        error: null,
      }),
      new RepositoryData({
        data: {a: 1, b: 'd'},
        progress: null,
        isPending: false,
        error: null,
      }),
    ]);
    expect(events).toEqual({
      start: [{key: '123'}],
      progress: [],
      success: [{a: 1, b: 'd'}],
      successCached: [],
      error: [],
      cancel: [],
      reset: [],
    });
  });

});
