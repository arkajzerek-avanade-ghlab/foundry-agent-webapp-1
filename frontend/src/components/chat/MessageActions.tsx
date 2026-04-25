import { memo, useState, useCallback, useRef, useEffect } from 'react';
import { Tooltip } from '@fluentui/react-components';
import {
  CopyRegular,
  ArrowClockwiseRegular,
  ThumbLikeRegular,
  ThumbDislikeRegular,
  Speaker2Regular,
  SpeakerOffRegular,
} from '@fluentui/react-icons';
import { stripMarkdown } from '../../utils/stripMarkdown';
import styles from './MessageActions.module.css';

interface MessageActionsProps {
  content: string;
  onRegenerate: () => void;
  onFeedback: (rating: 'positive' | 'negative') => void;
}

function MessageActionsComponent({ content, onRegenerate, onFeedback }: MessageActionsProps) {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Cancel any ongoing speech when the component unmounts
  useEffect(() => {
    return () => {
      if (utteranceRef.current) {
        window.speechSynthesis?.cancel();
      }
    };
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  }, [content]);

  const handleSpeak = useCallback(() => {
    if (!window.speechSynthesis) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      utteranceRef.current = null;
      setIsSpeaking(false);
      return;
    }

    const utterance = new SpeechSynthesisUtterance(stripMarkdown(content));
    utterance.onend = () => {
      utteranceRef.current = null;
      setIsSpeaking(false);
    };
    utterance.onerror = () => {
      utteranceRef.current = null;
      setIsSpeaking(false);
    };

    utteranceRef.current = utterance;
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }, [content, isSpeaking]);

  const handleFeedback = useCallback((rating: 'positive' | 'negative') => {
    const newRating = feedback === rating ? null : rating;
    setFeedback(newRating);
    if (newRating) {
      onFeedback(newRating);
    }
  }, [feedback, onFeedback]);

  return (
    <div className={styles.actionsBar}>
      <Tooltip content={copied ? 'Copied!' : 'Copy'} relationship="label" withArrow>
        <button
          className={styles.actionButton}
          onClick={handleCopy}
          aria-label="Copy message"
        >
          {copied && <span className={styles.copiedTooltip} role="status" aria-live="polite">Copied!</span>}
          <CopyRegular fontSize={16} />
        </button>
      </Tooltip>

      <Tooltip content={isSpeaking ? 'Stop reading' : 'Read aloud'} relationship="label" withArrow>
        <button
          className={`${styles.actionButton} ${isSpeaking ? styles.speakingActive : ''}`}
          onClick={handleSpeak}
          aria-label={isSpeaking ? 'Stop reading aloud' : 'Read aloud'}
          aria-pressed={isSpeaking}
          disabled={!window.speechSynthesis}
        >
          {isSpeaking ? <SpeakerOffRegular fontSize={16} /> : <Speaker2Regular fontSize={16} />}
        </button>
      </Tooltip>

      <Tooltip content="Regenerate" relationship="label" withArrow>
        <button
          className={styles.actionButton}
          onClick={onRegenerate}
          aria-label="Regenerate response"
        >
          <ArrowClockwiseRegular fontSize={16} />
        </button>
      </Tooltip>

      <Tooltip content="Good response" relationship="label" withArrow>
        <button
          className={`${styles.actionButton} ${feedback === 'positive' ? styles.feedbackSelected : ''}`}
          onClick={() => handleFeedback('positive')}
          aria-label="Good response"
          aria-pressed={feedback === 'positive'}
        >
          <ThumbLikeRegular fontSize={16} />
        </button>
      </Tooltip>

      <Tooltip content="Bad response" relationship="label" withArrow>
        <button
          className={`${styles.actionButton} ${feedback === 'negative' ? styles.feedbackSelected : ''}`}
          onClick={() => handleFeedback('negative')}
          aria-label="Bad response"
          aria-pressed={feedback === 'negative'}
        >
          <ThumbDislikeRegular fontSize={16} />
        </button>
      </Tooltip>
    </div>
  );
}

export const MessageActions = memo(MessageActionsComponent);
