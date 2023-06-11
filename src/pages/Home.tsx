import {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import {getDocs, collection, orderBy, query} from 'firebase/firestore/lite';
import {auth, firestore} from '../firebase.ts';
import {type PresentationDoc, type PresentationData} from '../presentation';
import DefaultLayout from '../layouts/DefaultLayout.tsx';
import Loading from '../components/Loading.tsx';

export default function Home() {
  useEffect(() => {
    document.title = `Slidr - Home`;
  }, []);

  const [presentations, setPresentations] = useState<PresentationDoc[]>();

  useEffect(() => {
    async function getPresentations() {
      const querySnapshot = await getDocs(
        query(collection(firestore, 'presentations'), orderBy('rendered')),
      );

      setPresentations(
        querySnapshot.docs.map((doc) => {
          const presentation: PresentationDoc = {
            id: doc.id,
            ...(doc.data() as PresentationData),
          };
          return presentation;
        }),
      );
    }

    void getPresentations();
  }, []);

  return (
    <DefaultLayout
      title={
        <>
          Browse Presentations
          <div className="text-teal i-tabler-microphone-2 ml-2" />
        </>
      }
    >
      <div className="grid grid-cols-2 lt-sm:grid-cols-1 max-w-screen-lg w-full mx-auto gap-8 px-4 justify-center">
        {presentations?.map((presentation) => (
          <div
            key={presentation.id}
            className="relative flex flex-col shadow-primary border-primary overflow-hidden sm:odd:last:(col-span-2 w-50% mx-auto)"
          >
            <div className="relative w-full h-full siblings:hover:opacity-100 border-b-2 border-teal">
              <Link to={`/${presentation.id}`} className="">
                {(presentation.title.length > 0 ||
                  presentation.username.length > 0) && (
                  <div className="absolute top-0 left-0 flex flex-col items-start bg-transparent">
                    {presentation.title.length > 0 && (
                      <div className="p-2 rounded-br-md bg-gray-900 bg-opacity-85">
                        {presentation.title}
                      </div>
                    )}
                    {presentation.username.length > 0 && (
                      <div className="px-2 pb-1 rounded-br-md bg-gray-900 bg-opacity-85 text-base">
                        by {presentation.username}
                      </div>
                    )}
                  </div>
                )}
                <img
                  className="w-full aspect-video"
                  src={presentation.pages[0]}
                />
              </Link>
            </div>
            <div className="flex flex-row pt-2 items-center gap-4 px-4">
              <Link to={`/${presentation.id}`} className="flex">
                <button
                  className="hover:children:(nav-active) overflow-hidden pb-2"
                  type="button"
                  title="Speaker view"
                >
                  <div className="flex flex-col items-center border-b-2 border-black">
                    <div className="i-tabler-presentation" />
                    <div className="text-base font-normal px-2">present</div>
                  </div>
                </button>
              </Link>
              <Link to={`/${presentation.id}/speaker`} className="flex">
                <button
                  className="hover:children:(nav-active) overflow-hidden pb-2"
                  type="button"
                  title="Speaker view"
                >
                  <div className="flex flex-col items-center border-b-2 border-black">
                    <div className="i-tabler-speakerphone" />
                    <div className="text-base font-normal px-2">speaker</div>
                  </div>
                </button>
              </Link>
              <Link to={`/${presentation.id}/view`} className="flex">
                <button
                  className="hover:children:(nav-active) overflow-hidden pb-2"
                  type="button"
                  title="Audience view"
                >
                  <div className="flex flex-col items-center border-b-2 border-black">
                    <div className="i-tabler-eyeglass" />
                    <div className="text-base font-normal px-2">audience</div>
                  </div>
                </button>
              </Link>
              <div className="flex-grow" />
              {presentation.uid === auth.currentUser?.uid && (
                <Link className="flex" to={`/${presentation.id}/notes`}>
                  <button
                    className="hover:children:(nav-active) overflow-hidden pb-2"
                    type="button"
                    title="Edit presentation"
                  >
                    <div className="flex flex-col items-center border-b-2 border-black">
                      <div className="i-tabler-pencil" />
                      <div className="text-base font-normal px-2">edit</div>
                    </div>
                  </button>
                </Link>
              )}
            </div>
          </div>
        )) ?? (
          <div className="absolute top-50% left-50%">
            <Loading />
          </div>
        )}
      </div>
    </DefaultLayout>
  );
}
