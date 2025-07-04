import React, { useState, useRef, useEffect } from 'react';

interface CollapsibleProps {
  title: React.ReactNode;
  children: React.ReactNode;
}

const Collapsible: React.FC<CollapsibleProps> = ({ title, children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.style.maxHeight = isOpen ? `${contentRef.current.scrollHeight}px` : '0px';
    }
  }, [isOpen]);

  return (
    <div className="collapsible">
      <button className="collapsible-header" onClick={() => setIsOpen(!isOpen)}>
        {title}
        <span className={`collapsible-icon ${isOpen ? 'open' : ''}`}>▼</span>
      </button>
      <div className="collapsible-content" ref={contentRef}>
        <div className="collapsible-content-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Collapsible;
