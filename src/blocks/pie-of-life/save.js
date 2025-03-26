import { useBlockProps } from '@wordpress/block-editor';

const Save = () => {
  const blockProps = useBlockProps.save();
  // Hardcoded area names
  const areaNames = ['ŠEIMA', 'DRAUGAI', 'LAISVALAIKIS', 'TOBULĖJIMAS', 'DARBAS / VERSLAS', 'NAMAI / BUITIS'];

  return (
    <div {...blockProps} className="wheel-of-life-widget">

      <table className="wheel-inputs">
        <thead>
          <tr style={{ fontSize: ".8em" }}>
            <th></th>
            <th>Kiek laiko skiri</th>
            <th>Kiek norėtum skirti</th>
            <th>Kokiu balu vertini</th>
          </tr>
        </thead>
        <tbody>
          {areaNames.map((name, index) => (
            <tr className="area" data-index={index} key={index}>
              <td style={{ fontSize: ".8em" }}>
                <span className="area-name">{name}</span>
              </td>
              <td style={{ textAlign: "center" }}>
                <input type="number" name="current" defaultValue={10} />
              </td>
              <td style={{ textAlign: "center" }}>
                <input type="number" name="desired" defaultValue={10} />
              </td>
              <td style={{ textAlign: "center" }}>
                <input type="number" name="rating" defaultValue={5} />
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={3}>Pakankamai geras balas</td>
            <td style={{ textAlign: "center" }}><input type="number" name="goodEnough" defaultValue={5} /></td>
          </tr>
        </tbody>
      </table>

      <button className="update-chart">Update Chart</button>
      <div id="chartdiv">
        <canvas id="wheelChart" width="600" height="500"></canvas>
      </div>
      <div id="result">
        <div id="averageScore"></div>
        <div id="averageTime"></div>
        <div id="family"></div>
        <div id="friends"></div>
        <div id="leisure"></div>
        <div id="growth"></div>
        <div id="work"></div>
        <div id="home"></div>
      </div>
    </div>
  );
};

export default Save;
