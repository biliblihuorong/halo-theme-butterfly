/**
 * @date: 2024/6/19
 * @author: 小红
 * @fileName: categories
 * @Description: 分类
 */
import {useChart} from '../core/_util';
import App from '../core/App';

@App([])
class Categories {

  /**
   * 图表
   */
  run_chart() {
    const chartDom = document.querySelector('section.content > .chart');
    if(!chartDom || !Array.isArray(MainApp.data)) return;

    const data = [];

    for (let i = 0; i < MainApp.data.length; i++) {

      const item = MainApp.data[i];

      data.push({value: item.postCount, name: item.spec.displayName});
    }

    useChart(chartDom, async (echarts) => {
      const {PieChart} = await import(/* webpackChunkName: "echarts" */ 'echarts/charts');
      const {TitleComponent, TooltipComponent, GridComponent, DataZoomComponent, LegendComponent} = await import(/* webpackChunkName: "echarts" */ 'echarts/components');
      const {CanvasRenderer} = await import(/* webpackChunkName: "echarts" */ 'echarts/renderers');
      echarts.use([
        PieChart,
        TitleComponent,
        TooltipComponent,
        GridComponent,
        DataZoomComponent,
        LegendComponent,
        CanvasRenderer,
      ]);

      return {
        backgroundColor: '',
        title: {
          text: '分类统计 📇',
          x: 'center',
        },
        tooltip: {
          formatter: '{a} <br/>{b} : {c} ({d}%)',
        },
        grid: {
          containLabel: true,
          bottom: '0%',
          left: '5%',
          right: '5%',
        },
        legend: {
          icon: 'circle',
          y: '95%',
          bottom: 'center',
        },
        series: [
          {
            name: '分类统计',
            type: 'pie',
            radius: [40, 150],
            center: ['50%', '48%'],
            roseType: 'area',
            itemStyle: {
              borderRadius: 8,
            },
            label: {
              formatter: '{b} : {c} ({d}%)',
            },
            data,
          },
        ],
      };
    });
  }
}
 
 
