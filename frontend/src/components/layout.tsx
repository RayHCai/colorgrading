import { PropsWithChildren } from 'react';

import Navbar from './navbar';

export default function Layout(props: PropsWithChildren) {
    return (
        <>
            <Navbar />

            { props.children }
        </>
    );
}
