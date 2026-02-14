import { forwardRef, type ReactNode } from 'react';
import './blocks.css';

interface BaseBlockProps {
  title: string;
  children: ReactNode;
  className?: string;
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'red';
  selectable?: boolean;
  isSelected?: boolean;
}

export const BaseBlock = forwardRef<HTMLDivElement, BaseBlockProps>(
  function BaseBlock(
    {
      title,
      children,
      className = '',
      color = 'blue',
      selectable = false,
      isSelected = false,
    },
    ref
  ) {
    return (
      <div
        ref={ref}
        className={`base-block block-${color} ${className} ${isSelected ? 'selected' : ''} ${selectable ? 'selectable' : ''}`}
      >
        <div className="block-header">
          <span className="block-title">{title}</span>
        </div>
        <div className="block-content">{children}</div>
      </div>
    );
  }
);
