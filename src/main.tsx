// eslint-disable-line unicorn/filename-case
import React, {lazy, Suspense} from 'react';
import ReactDOM from 'react-dom/client';
import '@unocss/reset/tailwind.css';
import 'virtual:uno.css';
import {createBrowserRouter, RouterProvider} from 'react-router-dom';
import './index.css';
import ErrorPage from './pages/ErrorPage.tsx';
import Loading from './components/Loading.tsx';

const Viewer = lazy(async () => import('./pages/Viewer.tsx'));
const Speaker = lazy(async () => import('./pages/Speaker.tsx'));
const Presentation = lazy(async () => import('./pages/Presentation.tsx'));
const Home = lazy(async () => import('./pages/Home.tsx'));
const SignIn = lazy(async () => import('./pages/SignIn.tsx'));
const Upload = lazy(async () => import('./pages/Upload.tsx'));
const PresentationPreferences = lazy(
  async () => import('./pages/PresentationPreferences.tsx'),
);

const router = createBrowserRouter([
  {
    path: '/',
    element: <Home />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/signin',
    element: <SignIn />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/:presentationId',
    element: <Presentation />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/:presentationId/view',
    element: <Viewer />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/:presentationId/speaker',
    element: <Speaker />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/:presentationId/notes',
    element: <PresentationPreferences />,
    errorElement: <ErrorPage />,
  },
  {
    path: '/upload',
    element: <Upload />,
    errorElement: <ErrorPage />,
  },
  {
    path: '*',
    element: <ErrorPage />,
  },
]);

ReactDOM.createRoot(document.querySelector('#root')!).render(
  <React.StrictMode>
    <Suspense
      fallback={
        <div className="h-screen w-screen">
          <Loading />
        </div>
      }
    >
      <RouterProvider router={router} />
    </Suspense>
  </React.StrictMode>,
);
