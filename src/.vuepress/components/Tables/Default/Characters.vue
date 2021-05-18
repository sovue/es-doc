<template>
  <div>
    <div>
      <label>Время суток:</label>
      <select v-model="timeOfDay.selected">
        <option
          v-for="({ label, value }, index) in timeOfDay.options"
          :key="index"
          :value="value"
        >
          {{ label }}
        </option>
      </select>
    </div>
    <table>
      <tr>
        <th>Переменная</th>
        <th>Персонаж</th>
        <th>
          Цвет ({{
            timeOfDay.options.find((v) => v.value === timeOfDay.selected).label
          }})
        </th>
      </tr>
      <tr
        v-for="({ id, name, color }, index) in characters"
        :key="index"
        :id="id"
      >
        <td>
          <a :href="'#' + id">#</a>
          <code>{{ id }}</code>
        </td>
        <td>
          {{ name }}
        </td>
        <td :style="{ color: color ? color[timeOfDay.selected] || color : '' }">
          {{ color ? color[timeOfDay.selected] || color : '' }}
        </td>
      </tr>
    </table>
  </div>
</template>

<script>
import sort from '@/functions/sort'

export default {
  data() {
    const characters = [
      { id: 'th', name: 'Мысли' },
      { id: 'mep', name: 'Парень', color: '' },
      { id: 'me', name: 'Семён', color: '#e1dd7d' },
      { id: 'my', name: 'Я', color: '#e1dd7d' },
      {
        id: 'usg',
        name: 'Девушка (Лена)',
        color: {
          night: '#aa64d9',
          sunset: '#b956ff',
          day: '#b956ff',
          prolog: '#b956ff',
        },
      },
      {
        id: 'unp',
        name: 'Пионерка (Лена)',
        color: {
          night: '#aa64d9',
          sunset: '#b956ff',
          day: '#b956ff',
          prolog: '#b956ff',
        },
      },
      {
        id: 'un',
        name: 'Лена',
        color: {
          night: '#aa64d9',
          sunset: '#b956ff',
          day: '#b956ff',
          prolog: '#b956ff',
        },
      },
      {
        id: 'dvg',
        name: 'Девушка (Алиса)',
        color: {
          night: '#d28b10',
          sunset: '#ffaa00',
          day: '#ffaa00',
          prolog: '#ffaa00',
        },
      },
      {
        id: 'dvp',
        name: 'Пионерка (Алиса)',
        color: {
          night: '#d28b10',
          sunset: '#ffaa00',
          day: '#ffaa00',
          prolog: '#ffaa00',
        },
      },
      {
        id: 'dv',
        name: 'Алиса',
        color: {
          night: '#d28b10',
          sunset: '#ffaa00',
          day: '#ffaa00',
          prolog: '#ffaa00',
        },
      },
      {
        id: 'usg',
        name: 'Девушка (Ульяна)',
        color: {
          night: '#ea3700',
          sunset: '#ff3200',
          day: '#ff3200',
          prolog: '#ff3200',
        },
      },
      {
        id: 'usp',
        name: 'Пионерка (Ульяна)',
        color: {
          night: '#ea3700',
          sunset: '#ff3200',
          day: '#ff3200',
          prolog: '#ff3200',
        },
      },
      {
        id: 'us',
        name: 'Ульяна',
        color: {
          night: '#ea3700',
          sunset: '#ff3200',
          day: '#ff3200',
          prolog: '#ff3200',
        },
      },
      {
        id: 'slg',
        name: 'Девушка (Славя)',
        color: {
          night: '#d6b000',
          sunset: '#ffd200',
          day: '#ffd200',
          prolog: '#ffd200',
        },
      },
      {
        id: 'slp',
        name: 'Пионерка (Славя)',
        color: {
          night: '#d6b000',
          sunset: '#ffd200',
          day: '#ffd200',
          prolog: '#ffd200',
        },
      },
      {
        id: 'sl',
        name: 'Славя',
        color: {
          night: '#d6b000',
          sunset: '#ffd200',
          day: '#ffd200',
          prolog: '#ffd200',
        },
      },
      {
        id: 'mip',
        name: 'Пионерка (Мику)',
        color: {
          night: '#00b4cf',
          sunset: '#00fcff',
          day: '#00deff',
          prolog: '#00deff',
        },
      },
      {
        id: 'mi',
        name: 'Мику',
        color: {
          night: '#00b4cf',
          sunset: '#00fcff',
          day: '#00deff',
          prolog: '#00deff',
        },
      },
      {
        id: 'ma',
        name: 'Маша',
        color: {
          night: '#00b4cf',
          sunset: '#00fcff',
          day: '#00deff',
          prolog: '#00deff',
        },
      },
      {
        id: 'uvp',
        name: 'Странная девочка (Юля)',
        color: {
          night: '#40d000',
          sunset: '#4eff00',
          day: '#4eff00',
          prolog: '#4eff00',
        },
      },
      {
        id: 'uv',
        name: 'Юля',
        color: {
          night: '#40d000',
          sunset: '#4eff00',
          day: '#4eff00',
          prolog: '#4eff00',
        },
      },
      {
        id: 'elp',
        name: 'Пионер (Электроник)',
        color: {
          night: '#cdcd00',
          sunset: '#ffff00',
          day: '#ffff00',
          prolog: '#ffff00',
        },
      },
      {
        id: 'el',
        name: 'Электроник',
        color: {
          night: '#cdcd00',
          sunset: '#ffff00',
          day: '#ffff00',
          prolog: '#ffff00',
        },
      },
      {
        id: 'ro',
        name: 'Роутер',
        color: {
          night: '#cdcd00',
          sunset: '#ffff00',
          day: '#ffff00',
          prolog: '#ffff00',
        },
      },
      {
        id: 'shp',
        name: 'Пионер (Шурик)',
        color: {
          night: '#cdc212',
          sunset: '#fff226',
          day: '#fff226',
          prolog: '#fff226',
        },
      },
      {
        id: 'sh',
        name: 'Шурик',
        color: {
          night: '#cdc212',
          sunset: '#fff226',
          day: '#fff226',
          prolog: '#fff226',
        },
      },
      {
        id: 'sa',
        name: 'Саша',
        color: {
          night: '#d6b000',
          sunset: '#ffd200',
          day: '#ffd200',
          prolog: '#ffd200',
        },
      },
      {
        id: 'mzp',
        name: 'Пионерка (Женя)',
        color: {
          night: '#5481db',
          sunset: '#72a0ff',
          day: '#72a0ff',
          prolog: '#72a0ff',
        },
      },
      {
        id: 'mz',
        name: 'Женя',
        color: {
          night: '#5481db',
          sunset: '#72a0ff',
          day: '#72a0ff',
          prolog: '#72a0ff',
        },
      },
      {
        id: 'mtp',
        name: 'Вожатая (Ольга Дмитриевна)',
        color: {
          night: '#00b627',
          sunset: '#00ea32',
          day: '#00ea32',
          prolog: '#00ea32',
        },
      },
      {
        id: 'mt',
        name: 'Ольга Дмитриевна',
        color: {
          night: '#00b627',
          sunset: '#00ea32',
          day: '#00ea32',
          prolog: '#00ea32',
        },
      },
      {
        id: 'mt_voice',
        name: 'Голос (Ольга Дмитриевна)',
        color: {
          night: '#00b627',
          sunset: '#00ea32',
          day: '#00ea32',
          prolog: '#00ea32',
        },
      },
      {
        id: 'csp',
        name: 'Медсестра (Виола)',
        color: {
          night: '#8686e6',
          sunset: '#a5a5ff',
          day: '#a5a5ff',
          prolog: '#a5a5ff',
        },
      },
      {
        id: 'cs',
        name: 'Виола',
        color: {
          night: '#8686e6',
          sunset: '#a5a5ff',
          day: '#a5a5ff',
          prolog: '#a5a5ff',
        },
      },
      { id: 'pi', name: 'Пионер', color: '#e60101' },
      {
        id: 'all',
        name: 'Пионеры',
        color: {
          night: '#e33a3a',
          sunset: '#e33a3a',
          day: '#ed4444',
          prolog: '#e33a3a',
        },
      },
      { id: 'voice', name: 'Голос', color: '#e1dd7d' },
      { id: 'bush', name: 'Голос', color: '#c0c0c0' },
      { id: 'voices', name: 'Голоса' },
      { id: 'dreamgirl', name: '...', color: '#c0c0c0' },
      { id: 'kids', name: 'Малышня' },
      // { id: 'lk', name: 'Люркмор-кун' },
      // { id: 'dy', name: 'Голос из динамика' },
      { id: 'message', name: 'Сообщение', color: '#c0c0c0' },
      { id: 'odn', name: 'Одногруппник', color: '#c0c0c0' },
    ]

    return {
      characters: sort(characters, 'name'),
      timeOfDay: {
        selected: 'prolog',
        options: [
          { label: 'Пролог', value: 'prolog' },
          { label: 'День', value: 'day' },
          { label: 'Вечер', value: 'sunset' },
          { label: 'Ночь', value: 'night' },
        ],
      },
    }
  },
}
</script>
