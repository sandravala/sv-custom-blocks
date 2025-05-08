import { useBlockProps } from '@wordpress/block-editor';

const Save = () => {
  const blockProps = useBlockProps.save();
  return (
    <div {...blockProps} className="timeblock-builder">
      <div id="timeblock-builder-container"></div>
    </div>
  );
};

export default Save;
