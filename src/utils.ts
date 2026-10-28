export const SUBJECTS = ['数学', '物理', '化学', '英语', '语文', '生物', '其他'];
export const ERROR_TYPES = ['概念不清', '计算失误', '审题偏差', '方法不会', '知识遗忘', '表达不规范'];

export const subjectColors: Record<string, string> = {
  数学: '#7566d7', 物理: '#268a85', 化学: '#d08042', 英语: '#4b7fc1', 语文: '#c36276', 生物: '#649451', 其他: '#7b8494',
};

export function formatDate(value: string, withTime = false) {
  if (!value) return '暂无';
  const date = new Date(value);
  return new Intl.DateTimeFormat('zh-CN', withTime
    ? { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}

export function reviewLabel(value: string, mastery: string) {
  if (mastery === '已掌握') return `${formatDate(value)} 再复习`;
  const due = new Date(value);
  const today = new Date(); today.setHours(23, 59, 59, 999);
  if (due <= today) return '今天该复习';
  return `${formatDate(value)} 复习`;
}

export async function compressImage(file: File): Promise<string> {
  if (file.size > 20 * 1024 * 1024) throw new Error('照片不能超过 20 MB');
  const source = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('照片读取失败'));
    reader.readAsDataURL(file);
  });
  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error('无法识别这张图片'));
    element.src = source;
  });
  const max = 1800;
  const scale = Math.min(1, max / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.84);
}
