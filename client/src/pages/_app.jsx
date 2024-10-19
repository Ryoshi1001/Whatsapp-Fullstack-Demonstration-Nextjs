import '@/styles/globals.css';
import { StateProvider } from '../context/StateContext';
import reducer, { initialState } from '@/context/StateReducers';
import Head from 'next/head';

export default function App({ Component, pageProps }) {
  return (
    <StateProvider initialState={initialState} reducer={reducer}>
      <Head>
        <title>Whatsapp</title>
        <link rel="icon" href="/favicon.png" />
      </Head>
      <Component {...pageProps} />
    </StateProvider>
  );
}
