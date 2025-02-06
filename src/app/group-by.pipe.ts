import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'groupBy',
    pure: true,
    standalone: false
})
export class GroupByPipe implements PipeTransform {
  transform(array: any[], field: string): { key: string, items: any[] }[] {
    if (!Array.isArray(array) || !field) {
      return [];
    }

    const grouped = array.reduce((result, item) => {
      const key = this.getNestedPropertyValue(item, field);

      if (!result[key]) {
        result[key] = [];
      }

      result[key].push(item);
      return result;
    }, {});
    let ret =  Object.keys(grouped).map(key => ({ key, items: grouped[key] }));
    console.log('pipd',ret)
    return ret;
  }

  private getNestedPropertyValue(obj: any, path: string): any {
    return path.split('.').reduce((o, key) => (o && o[key] ? o[key] : null), obj);
  }

}
