import { useBlockProps } from '@wordpress/block-editor';

const Save = () => {
  const blockProps = useBlockProps.save();

  return (
    <div {...blockProps} className="zoom-meeting-widget">
    </div>
  );
};

export default Save;