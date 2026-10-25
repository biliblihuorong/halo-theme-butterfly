/**
 * @date: 2024/4/30
 * @author: 小红
 * @fileName: archives
 * @Description:归档
 */
import {useChart} from '../core/_util';
import App from '../core/App';
import pagination from '../modules/Pagination';

@App([pagination])
class Archives {
  /***
   * @desc: 图表
   */
  run_chart() {
    const chartDom = document.querySelector('.archives .content > .chart');

    if(!chartDom) return;

    useChart(chartDom, async (echarts) => {
      const {LineChart} = await import(/* webpackChunkName: "echarts", webpackExports: ["LineChart"] */ 'echarts/charts');
      const {TitleComponent, TooltipComponent, GridComponent, DataZoomComponent} = await import(/* webpackChunkName: "echarts", webpackExports: ["TitleComponent", "TooltipComponent", "GridComponent", "DataZoomComponent"] */ 'echarts/components');
      const {CanvasRenderer} = await import(/* webpackChunkName: "echarts", webpackExports: ["CanvasRenderer"] */ 'echarts/renderers');
      echarts.use([
        LineChart,
        TitleComponent,
        TooltipComponent,
        GridComponent,
        DataZoomComponent,
        CanvasRenderer,
      ]);

      const data = [];

      for (let year of MainApp.data) {
        for (let months of year['months']) {
          data.push([
            `${year['year']}-${months['month']}`,
            //模板投影输出 {month, count}（Thymeleaf 内联 Map 字面量会被 SpEL 拒绝，见 archives.html）
            months['count'],
          ]);
        }
      }

      return {
        color: ['#425aef'],
        title: {
          text: '归档统计📃',
          x: 'center',
        },
        tooltip: {
          trigger: 'axis',
          axisPointer: {
            type: 'shadow',
            shadowStyle: {
              color: 'rgba(66,90,239,0.3)',
            },
          },
        },
        grid: {
          left: '5%', // 调整左边距
          right: '5%', // 调整右边距
        },
        xAxis: {
          type: 'category',
          boundaryGap: false,
        },
        yAxis: {
          name: '篇',
          axisLine: {
            show: true,
          },
        },
        series: [
          {
            zlevel: 0,
            z: 2,
            name: '文章篇数',
            type: 'line',
            smooth: true,
            symbol: 'none',
            lineStyle: {
              color: '#425aef',
              width: 1,
            },
            areaStyle: {
              color: {
                type: 'linear',
                x: 0,
                y: 0,
                x2: 0,
                y2: 1,
                colorStops: [
                  {
                    offset: 0,
                    color: '#425aef', // 0% 处的颜色
                  },
                  {
                    offset: 1,
                    color: '#FFFFFF', // 100% 处的颜色
                  },
                ],
                global: false, // 缺省为 false
              },
            },
            data, // 这里需要填入实际的数据
          },
        ],
      };
    });
  }
}