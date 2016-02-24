import React from 'react';
import ReactDOM from 'react-dom';
import { Router, IndexRoute, Route } from 'react-router';
import createBrowserHistory from 'history/lib/createBrowserHistory';
import { IndexPage } from './pages';

ReactDOM.render(
  <Router history={createBrowserHistory()}>
    <Route path='/'         component={IndexPage}/>
  </Router>,
  document.getElementById('app-container')
);
