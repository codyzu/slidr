import {useCallback, useState, useMemo} from 'react';
import {
  type HandlerEntries,
  type Handler,
  type Payload,
} from '../broadcast/use-channel-handlers';

export function useSlideIndex({
  ignorePost,
  postMessage,
  slideCount,
}: {
  ignorePost?: boolean;
  postMessage: Handler;
  slideCount: number;
}): {
  slideIndex: number;
  setSlideIndex: (index: number) => void;
  navNext: () => void;
  navPrevious: () => void;
  handlers: HandlerEntries;
} {
  const [slideIndex, setSlideIndex] = useState(0);
  const previousSlideIndex = Math.max(slideIndex - 1, 0);
  const nextSlideIndex = Math.min(slideIndex + 1, slideCount - 1);

  const updateSlideIndex = useCallback((index?: number) => {
    if (index !== undefined) {
      setSlideIndex(index);
    }
  }, []);

  const postSlideIndex = useCallback(
    (index: number) => {
      postMessage({id: 'slide index', index});
    },
    [postMessage],
  );

  const updateSlideIndexAndPost = useCallback(
    (index: number) => {
      updateSlideIndex(index);
      if (!ignorePost) {
        postSlideIndex(index);
      }
    },
    [updateSlideIndex, postSlideIndex, ignorePost],
  );

  const navNext = useCallback(() => {
    updateSlideIndexAndPost(nextSlideIndex);
  }, [updateSlideIndexAndPost, nextSlideIndex]);

  const navPrevious = useCallback(() => {
    updateSlideIndexAndPost(previousSlideIndex);
  }, [updateSlideIndexAndPost, previousSlideIndex]);

  const handlers = useMemo<HandlerEntries>(
    () => [
      [
        'slide index',
        (payload: Payload) => {
          updateSlideIndex(payload.index);
        },
      ],
      [
        'heartbeat',
        (payload: Payload) => {
          updateSlideIndex(payload.index);
        },
      ],
    ],
    [updateSlideIndex],
  );

  return {
    handlers,
    slideIndex,
    setSlideIndex: updateSlideIndexAndPost,
    navNext,
    navPrevious,
  };
}
