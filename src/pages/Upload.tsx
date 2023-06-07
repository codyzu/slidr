import {useCallback, useEffect, useRef, useState} from 'react';
import {useDropzone} from 'react-dropzone';
import {Document, Page} from 'react-pdf';
import * as pdfjs from 'pdfjs-dist';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import clsx from 'clsx';
import {
  type DocumentReference,
  addDoc,
  collection,
  updateDoc,
} from 'firebase/firestore/lite';
import {ref as storageRef, uploadBytes, getDownloadURL} from 'firebase/storage';
import {nanoid} from 'nanoid';
import {useDebouncedCallback} from 'use-debounce';
import {auth, firestore, storage} from '../firebase';
import '../pdf/pdf.css';

const src = new URL('pdfjs-dist/build/pdf.worker.js', import.meta.url);
pdfjs.GlobalWorkerOptions.workerSrc = src.toString();

export default function Export() {
  const [file, setFile] = useState<File>();
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [uploadDone, setUploadDone] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [presentationRef, setPresentationRef] = useState<DocumentReference>();
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setFile(acceptedFiles[0]);
    const presentationRef = await addDoc(
      collection(firestore, 'presentations'),
      {created: new Date(), uid: auth.currentUser?.uid},
    );
    setPresentationRef(presentationRef);
    const originalName = `${nanoid()}.pdf`;
    const originalRef = storageRef(
      storage,
      `presentations/${presentationRef.id}/${originalName}`,
    );
    await uploadBytes(originalRef, acceptedFiles[0], {
      cacheControl: 'public;max-age=604800',
    });
    const originalDownloadUrl = await getDownloadURL(originalRef);
    await updateDoc(presentationRef, {original: originalDownloadUrl});
    setRendering(true);
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: {
      // eslint-disable-next-line @typescript-eslint/naming-convention
      'application/pdf': ['.pdf'],
    },
    maxFiles: 1,
  });

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [renderingDone, setRenderingDone] = useState(false);
  const [pageBlob, setPageBlob] = useState<Blob>();
  function pageRendered() {
    canvasRef.current?.toBlob(async (blob) => {
      if (!blob) {
        throw new Error(`Error rendering page index ${pageIndex}`);
      }

      setPageBlob(blob);
    }, 'image/webp');
  }

  const [uploadPromises, setUploadPromises] = useState<Array<Promise<string>>>(
    [],
  );
  useEffect(() => {
    async function uploadPage() {
      const pageStorageRef = storageRef(
        storage,
        `presentations/${presentationRef!.id}/${pageIndex
          .toString()
          .padStart(3, '0')}_${nanoid()}.webp`,
      );

      await uploadBytes(pageStorageRef, pageBlob!, {
        cacheControl: 'public;max-age=604800',
      });
      const pageUrl = await getDownloadURL(pageStorageRef);
      return pageUrl;
    }

    if (!rendering || !pageBlob || !presentationRef) {
      return;
    }

    const uploadPromise = uploadPage();
    setUploadPromises((currentPromises) => [...currentPromises, uploadPromise]);
    setPageBlob(undefined);

    if (pageIndex < pageCount - 1) {
      setPageIndex(pageIndex + 1);
    } else {
      setRenderingDone(true);
    }
  }, [rendering, pageBlob, pageIndex, presentationRef, pageCount]);

  const [title, setTitle] = useState('');
  const [titleSaved, setTitleSaved] = useState('');
  const [titlePending, setTitlePending] = useState(false);
  const [titleDone, setTitleDone] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    async function updatePages() {
      if (!presentationRef || !renderingDone || uploadDone || uploading) {
        return;
      }

      setUploading(true);

      const pageUrls = await Promise.all(uploadPromises);

      const presentationUpdates: {
        pages: string[];
        rendered: Date;
        title?: string;
      } = {pages: pageUrls, rendered: new Date()};
      if (titlePending && title.length > 0) {
        presentationUpdates.title = title;
        setTitlePending(false);
        setTitleSaved(title);
      }

      await updateDoc(presentationRef, presentationUpdates);
      setUploadDone(true);
      setTitleDone(true);
    }

    void updatePages();
  }, [
    presentationRef,
    renderingDone,
    uploadPromises,
    title,
    titlePending,
    uploadDone,
    uploading,
  ]);

  function getUserFeedback() {
    if (file && !rendering) {
      return [
        'Initializing...',
        'i-tabler-loader-3 animate-spin animate-duration-1000',
      ];
    }

    if (file && rendering && !renderingDone) {
      return ['Rendering...', 'i-tabler-loader-3 animate-spin'];
    }

    if (file && rendering && renderingDone && !uploadDone) {
      return ['Uploading...', 'i-tabler-arrow-big-up-lines animate-bounce'];
    }

    if (file && rendering && renderingDone && uploadDone) {
      return ['Done', 'i-tabler-check'];
    }

    return ['', ''];
  }

  const [message, icon] = getUserFeedback();

  useEffect(() => {
    if (!uploadDone || !presentationRef || titleSaved === title) {
      return;
    }

    setTitlePending(false);
    setTitleSaved(title);
    void updateDoc(presentationRef, {title});
    setTitleDone(true);
  }, [title, uploadDone, presentationRef, titleSaved]);

  const setDebouncedTitle = useDebouncedCallback((nextTitle: string) => {
    setTitle(nextTitle);
  }, 1000);

  return (
    <div className="overflow-hidden flex flex-col items-center p-4 gap-6 pb-10 w-full max-w-screen-sm mx-auto">
      {!file && (
        <div
          className="btn rounded-md p-8 flex flex-col items-center justify-center w-full aspect-video gap-4 cursor-pointer"
          {...getRootProps()}
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <>
              <div className="i-tabler-arrow-big-down-lines text-6xl animate-bounce animate-duration-500 text-teal-500" />
              <div className="text-center">
                Drop the pdf presentation here...
              </div>
            </>
          ) : (
            <>
              <div className="i-tabler-arrow-big-down-lines text-6xl animate-bounce" />
              <div className="text-center">
                Drag &apos;n&apos; drop a pdf presentation here, or click to
                select a pdf presentation
              </div>
            </>
          )}
        </div>
      )}
      {file && (
        <div className="flex flex-col w-full aspect-video">
          <Document
            file={file}
            className="w-full aspect-video relative rounded-t-md overflow-hidden"
            onLoadSuccess={(pdf) => {
              setPageCount(pdf.numPages);
            }}
          >
            <Page
              pageIndex={pageIndex}
              className="w-full h-full"
              canvasRef={canvasRef}
              width={1920}
              // We want the exported images to be 1920, irrespective of the pixel ratio
              // Fix the ratio to 1
              devicePixelRatio={1}
              onRenderSuccess={() => {
                pageRendered();
              }}
            />
            <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center bg-teal-800 bg-opacity-90">
              <div className={clsx('w-10 h-10', icon)} />
              <div>{message}</div>
            </div>
          </Document>
          <div
            className="h-[6px] bg-teal"
            style={{width: `${((pageIndex + 1) * 100) / pageCount}%`}}
          />
          <div>Rendering slide: {pageIndex + 1}</div>
        </div>
      )}
      <div className="input flex flex-row gap-2 items-center w-full focus-within:(border-focus outline-focus shadow-focus)">
        <input
          placeholder="Give your presentation a name..."
          className="bg-transparent border-none focus-visible:(border-none outline-none) flex-grow"
          onChange={(event) => {
            console.log('pending');
            setTitlePending(true);
            setTitleDone(false);
            setDebouncedTitle(event.target.value);
          }}
        />
        <div
          className={clsx(
            titlePending && 'i-tabler-loader-3 animate-spin',
            titleDone && 'i-tabler-check',
            'text-violet-700',
          )}
        />
      </div>
    </div>
  );
}
